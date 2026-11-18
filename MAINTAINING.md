# Обслуживание каталога

Заметки для мейнтейнеров KodaPlugins. Авторам плагинов достаточно [README](README.md).

## Автоматическая проверка и обновление

В pull request срабатывает workflow `.github/workflows/check.yml`. Он скачивает каждый архив из `plugins/`, сверяет SHA-256, распаковывает архив, проверяет манифест командой `koda-plugin validate` и сверяет `id` в манифесте с записью.

При пуше в ветку `main` или слиянии pull request срабатывает workflow `.github/workflows/publish.yml`, который:

1. Выполняет те же проверки и собирает `metadata.json`
2. Создаёт коммит с обновлённым `metadata.json`, если каталог изменился
3. Использует сообщение `chore: update metadata.json`

## Команды

```bash
npm ci          # установить SDK @kodadev/desktop-plugin-sdk (из Nexus, адрес в .npmrc)
npm run check   # проверить все записи, не меняя metadata.json
npm run build   # проверить записи и записать metadata.json
```

## О файле metadata.json

Файл `metadata.json` содержит все плагины каталога. Koda Desktop читает его по адресу <https://raw.githubusercontent.com/XCode-NLP/KodaPlugins/main/metadata.json>. Файл собирает CI, вручную его не правят.

```json
{
  "lastUpdate": "2026-11-17T17:34:16.917Z",
  "plugins": [
    {
      "id": "com.example.hello",
      "name": { "ru": "Привет", "en": "Hello" },
      "description": {
        "ru": "Пример плагина: панель рядом с чатом и инструмент агента.",
        "en": "Example plugin: a pane next to the chat and an agent tool."
      },
      "version": "1.0.0",
      "publisher": "Koda Examples",
      "permissions": ["agent.tools", "chat.composer"],
      "homepage": "https://github.com/you/hello",
      "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i…",
      "archive": {
        "url": "https://github.com/you/hello/releases/download/v1.0.0/com.example.hello-1.0.0.kodaplugin",
        "sha256": "a804257a23287086691f365bc4ae44e1dbbbb58efe4a73d2864e1193182d6118",
        "size": 4490
      }
    }
  ]
}
```

Поле `icon` CI берёт из файла `icon` манифеста: SVG или PNG до 64 КБ, закодированный в data-URL. Если иконки нет или она больше, поля нет, и карточка показывает значок по умолчанию.

Поля `name`, `description`, `version`, `publisher` и `permissions` берутся из `koda-plugin.json` внутри архива. `size` содержит размер архива в байтах. Архив больше 60 МБ не проходит проверку, потому что установщик Koda Desktop его тоже отвергнет.

`lastUpdate` меняется только вместе со списком плагинов, поэтому повторная сборка без изменений не создаёт коммит.
