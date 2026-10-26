---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### В `title` попадает путь, а не заголовок статьи

`displayPath` в `extractHelptagTagValue` — это относительный путь `.md`-файла, а не его `title` из frontmatter. В результате на странице `helptags/index.md` под каждым тегом — технические имена:

```
* **breadcrumb**
  * [Модули/МодульХлебныеКрошки](../Модули/МодульХлебныеКрошки/index.md)
```

А не человекочитаемые («Модуль. Хлебные крошки»). Для навигации сгодится, но в сравнении с `contexts` (где `buildTree` резолвит `title` через `index.md` родительской папки) выглядит беднее. Починка — добавить `getTitleFromMetadata` в extractor (как в `abbrs`/`terms`/`gosts`) или отдельный `resolveFolderTitle` (как в `contexts`).

### `SKIP_DIRS` короче, чем у соседних модулей

`walkMdFilesGetHelptags` пропускает только две папки — `helptags` и `contexts`. У `abbrs` и `terms` список шире: `['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap']`. У `contexts` — только `contexts` (и `helptags` через `context-search.client.js`-косвенность).

Если у пользователя есть папка `figures/` или `roadmap/` с ручными `.md` (не сгенерированными), где стоит `helptag:`, — она попадёт в индекс. С генераторами (`figures/index.md`, `roadmap/index.md`) проблемы нет: у них нет поля `helptag:` в frontmatter, они туда не попадут. Но несимметричность может сбить с толку при чтении кода.

### Страницы под тегом не сортируются

`pages[]` пополняется в порядке обхода папок (`fs.readdirSync`), а не по алфавиту и не по `rank`. На `contexts` аналогичный список сортируется через `Intl.Collator`, здесь — нет. Порядок между запусками стабилен (пока не изменится файловая структура), но не семантичен.

### Модуль не экспортируется из `diplodoc-helper-cli.js`

В отличие от `generateHelpMap`, `generateContexts`, `generateAbbrs`, `generateTerms`, `generateGosts` — функция `runGeneration` для `helptags` **не входит** в `module.exports` файла `src/plugins/diplodoc-helper-cli.js`:

```js
const { runGeneration: generateHelptags } = require('./helptags/helptags.js');
// ...
module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    // ... generateHelptags отсутствует
};
```

Внутри CLI-команды `helptags` вызов работает (`if (require.main === module)`), но при попытке `require('diplodoc-helper-cli').generateHelptags` — `undefined`. Для внешних интеграций (кто-то хочет встроить вызов) это неудобно. Починка — добавить в `module.exports`.

### Нет `helptags.paths.yaml` — путь захардкожен

Папка `docs/<lang>/helptags/` задана литералом в `generateFilesForLang`. В отличие от `abbrs`, `terms`, `gosts`, где папка настраивается через YAML, здесь смена пути — правка кода.

### `helptag.Update` и `helptag.Delete` не связаны с этим модулем

Пользователь, ищущий «helptag» в палитре команд VS Code, найдёт `helptag.Update` / `helptag.Delete` и `generateHelpMaps`. Ни одна из них не генерирует страницу-указатель. Легко принять одну за другую:

- `helptag.Update` — правит поле в **одном** разделе;
- `helptag.Delete` — удаляет поле из **одного** раздела;
- `generateHelpMaps` — модуль `helpMap`, JSON для фронтенда;
- `helptags` (этот модуль) — только через CLI.

Разделение по слоям и по смыслу, но с точки зрения пользователя — «helptag» в трёх разных контекстах.

### `lstatSync` без `withFileTypes` — потенциальная проблема с симлинками

`walk` в collector использует `fs.lstatSync(fullPath).isDirectory()`. Для символической ссылки на папку `isDirectory()` вернёт `false` (lstat не следует по ссылке). Если в проекте есть симлинк-папка, её содержимое не будет проиндексировано. В `contexts`/`abbrs`/`terms` используется `readdirSync(..., { withFileTypes: true })` — поведение похожее, но чуть иное для симлинков.

### Возможные пустые языковые папки

Если в `en/` нет ни одной статьи с `helptag:`, `helptagMap` пуст → `generateFilesForLang` возвращает `false` → `results.failed.push('en')`. В CLI это никак не отражается (модуль не читает `results`), но в VS Code-вызове (если бы он был) это выглядело бы как ошибка. Сейчас VS Code-вызова нет, так что пункт «спящий».