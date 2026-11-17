# Плагины Koda Desktop

Каталог плагинов для маркетплейса Koda Desktop. Код плагинов лежит в репозиториях авторов, здесь хранятся только ссылки на собранные архивы `.kodaplugin` и их SHA-256.

Koda Desktop читает [`metadata.json`](metadata.json). Этот файл собирает CI, руками его не правят.

## Как добавить плагин

1. Создайте плагин из шаблона [koda-plugin-template](https://github.com/XCode-NLP/koda-plugin-template) (кнопка «Use this template»).
2. Поставьте тег `v1.0.0`: GitHub Actions соберёт архив и приложит его к релизу вместе с `SHA256SUMS`.
3. Сделайте форк этого репозитория и добавьте файл `plugins/<id>.json`, где `<id>` совпадает с `id` в `koda-plugin.json`:

   ```json
   {
     "id": "com.example.my-plugin",
     "homepage": "https://github.com/you/my-plugin",
     "archive": {
       "url": "https://github.com/you/my-plugin/releases/download/v1.0.0/com.example.my-plugin-1.0.0.kodaplugin",
       "sha256": "64 hex-символа из SHA256SUMS"
     }
   }
   ```

4. Откройте PR. CI скачает архив, сверит SHA-256 и проверит манифест. Мейнтейнеры посмотрят код плагина и его разрешения.

Имя, описание, версию, издателя и разрешения CI берёт из манифеста внутри архива, дублировать их не нужно.

## Как выпустить обновление

Выпустите новый релиз и пришлите PR, где в `plugins/<id>.json` заменены `url` и `sha256`. Опубликованный архив не перезаписывают: у новой версии новый тег.

## Проверка локально

```bash
npm ci
npm run check
```

SDK `@kodadev/desktop-plugin-sdk` ставится из Nexus, адрес задан в `.npmrc`.
