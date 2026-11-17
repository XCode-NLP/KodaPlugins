// Собирает metadata.json из plugins/*.json: скачивает каждый архив, сверяет
// sha256, проверяет манифест через koda-plugin validate и берёт из него
// имя, описание, версию, издателя и разрешения.
//
//   node scripts/build-catalog.mjs          проверить и записать metadata.json
//   node scripts/build-catalog.mjs --check  только проверить (для PR)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const METADATA = path.join(ROOT, "metadata.json");
const CLI = path.join(ROOT, "node_modules", ".bin", "koda-plugin");
// Тот же лимит, что у установщика Koda Desktop.
const MAX_ARCHIVE_BYTES = 60 * 1024 * 1024;
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const ENTRY_KEYS = new Set(["id", "homepage", "archive"]);

const check = process.argv.includes("--check");
const errors = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function readEntry(file) {
  let entry;
  try {
    entry = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, file), "utf8"));
  } catch (error) {
    fail(file, `не читается как JSON (${error.message})`);
    return null;
  }
  const extra = Object.keys(entry).filter((key) => !ENTRY_KEYS.has(key));
  if (extra.length) fail(file, `лишние поля: ${extra.join(", ")}`);
  if (typeof entry.id !== "string" || !ID_PATTERN.test(entry.id)) fail(file, "id в неверном формате");
  else if (`${entry.id}.json` !== file) fail(file, `файл должен называться ${entry.id}.json`);
  if (entry.homepage !== undefined && !/^https:\/\//.test(entry.homepage ?? "")) {
    fail(file, "homepage должен начинаться с https://");
  }
  const archive = entry.archive ?? {};
  if (!/^https:\/\//.test(archive.url ?? "")) fail(file, "archive.url должен начинаться с https://");
  if (!/^[0-9a-f]{64}$/.test(archive.sha256 ?? "")) fail(file, "archive.sha256: 64 символа в нижнем регистре");
  return errors.some((line) => line.startsWith(`${file}:`)) ? null : entry;
}

async function download(file, url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`архив не скачался: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > MAX_ARCHIVE_BYTES) throw new Error(`архив больше ${MAX_ARCHIVE_BYTES} байт`);
  return data;
}

async function inspect(file, entry) {
  const data = await download(file, entry.archive.url);
  const sha256 = createHash("sha256").update(data).digest("hex");
  if (sha256 !== entry.archive.sha256) throw new Error(`sha256 не совпадает: в архиве ${sha256}`);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "koda-plugin-"));
  try {
    const archivePath = path.join(dir, "plugin.kodaplugin");
    const unpacked = path.join(dir, "plugin");
    fs.writeFileSync(archivePath, data);
    execFileSync("unzip", ["-q", archivePath, "-d", unpacked], { stdio: "pipe" });
    execFileSync(CLI, ["validate", unpacked], { stdio: "pipe" });
    const manifest = JSON.parse(fs.readFileSync(path.join(unpacked, "koda-plugin.json"), "utf8"));
    if (manifest.id !== entry.id) throw new Error(`id в манифесте ${manifest.id}, а в записи ${entry.id}`);
    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      publisher: manifest.publisher,
      permissions: manifest.permissions,
      ...(entry.homepage ? { homepage: entry.homepage } : {}),
      archive: { url: entry.archive.url, sha256, size: data.length },
    };
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    throw new Error(stderr || error.message);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const files = fs.readdirSync(PLUGINS_DIR).filter((name) => name.endsWith(".json")).sort();
const plugins = [];
for (const file of files) {
  const entry = readEntry(file);
  if (!entry) continue;
  try {
    plugins.push(await inspect(file, entry));
    console.log(`ok: ${file}`);
  } catch (error) {
    fail(file, error.message);
  }
}

if (errors.length) {
  console.error(`\nОшибки:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}

if (check) {
  console.log(`\nВсе записи в порядке: ${plugins.length}`);
} else {
  // lastUpdate меняется только вместе со списком, чтобы не было пустых коммитов.
  const previous = fs.existsSync(METADATA) ? JSON.parse(fs.readFileSync(METADATA, "utf8")) : null;
  const unchanged = previous && JSON.stringify(previous.plugins) === JSON.stringify(plugins);
  const lastUpdate = unchanged ? previous.lastUpdate : new Date().toISOString();
  fs.writeFileSync(METADATA, `${JSON.stringify({ lastUpdate, plugins }, null, 2)}\n`);
  console.log(`\nmetadata.json: ${plugins.length} плагинов${unchanged ? ", без изменений" : ""}`);
}
