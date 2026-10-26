---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### `module.exports` — только 9 из 24

Экспортируется только `generateHelpMap`, `generateContexts`, `generateBreadcrumb`, `generateTocCleanMode`, `fixFootnoteAnchors`, `reindexFigures`, `generateFigures`, `generateAbbrs`, `generateTerms`, `generateGosts`. Отсутствуют: `generateHelptags`, `generateRoadmap`, `generateContexttags`, `reindexFootnotes`, `renumberFootnotes`, `injectGostsTable`, `injectAbbrTitles`, `injectTermTitles`, `generateNavigationContent`, `injectFootnoteList`.

Для внешних интеграций (require('diplodoc-helper-cli').generateRoadmap) — `undefined`.

### Нет `--help`

`node ./plugins/diplodoc-helper-cli.js` без аргументов — `command = undefined`, все `if` пропускаются, `process.exit(0)` **молча**. Нет списка команд, нет справки.

Правильно — либо `if (!command) { console.log('Usage: …'); process.exit(0); }`, либо отдельная ветка `--help`.

### Нет валидации команд

Неизвестная команда (`node cli.js foo`) — все `if` пропускаются, `exit 0` **молча**. Пользователь ожидает `exit 1` + «Неизвестная команда».

### `--docsDir` без значения — `undefined`

```js
const docsDirIndex = args.indexOf('--docsDir');
const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';
```

Если `--docsDir` последним аргументом (`node cli.js helpMap --docsDir`), `args[docsDirIndex + 1] = undefined`, `docsDir = undefined`. В `helpMap` вызове `collectHelpData(undefined)` → `fs.readdirSync(undefined)` → `throw`. Не поймано.

### `code return` — не устанавливается при ошибке

Только `gostsInject` и `footnoteAnchors` устанавливают `process.exitCode = 1`. Остальные 22 команды — `process.exitCode = 0` всегда. `reindexFigures` может вернуть `{ success: false }`, но `diplodoc-helper-cli` это **не** проверяет.

`docs-build.js` **не** останавливается на упавших шагах, потому что exit code = 0.

### `roadMap` — `--dataRaw` теряется

```js
const dataRaw = args[dataRawIndex !== -1 ? dataRawIndex + 1 : undefined];
generateRoadMap({ docsRoot: docsDir, dataPath, dataRaw, engine: DiagramEngine.MERMAID });
```

`generateRoadMap` (`roadmap.js`) читает `options.data`, а не `options.dataRaw`. `--dataRaw` **не работает** (fallback на `dataPath` или `DEFAULT_DATA_PATH`).

### `ganttFixScroll` — `docsRoot` вместо `buildDir`

```js
} else if (command === 'ganttFixScroll') {
    generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
}
```

`generateGanttFixScroll` (`roadmap.patcher`) читает `options.buildDir`, а не `options.docsRoot`. Работает только потому, что в `docs-build.js` `cli('ganttFixScroll', './build')` — `outputDir` совпадает с `./build` (дефолт). `--outputDir ./custom` — не сработает.

### `reindexFigures` — `targetLocale` из env

```js
const { targetLocale, configObj } = DiplodocConfigFromCli(CONFIG_KEY);
reindexFigures(docsDir, targetLocale, configObj);
```

`targetLocale` берётся из `process.env.CLI_LOCALE` (или `defaultLanguage` из конфига). Аргумент `--locale` **не поддерживается**.

### `gostsInject` — `findSectionIndexHtml` без `--targetHtml`

```js
if (targetHtmlIdx !== -1) {
    targetHtml = path.resolve(args[targetHtmlIdx + 1]);
} else {
    targetHtml = findSectionIndexHtml(outputDir, section);
}
```

`findSectionIndexHtml` возвращает `null`, если папка не найдена. Далее `if (!targetHtml || !fs.existsSync(targetHtml))` → `console.error`, `process.exitCode = 1`. Правильно.

### `footnoteList` — `--section` и `--targetHtml` без валидации приоритета

```js
if (section) {
    targetHtml = findSectionIndexHtml(outputDir, section);
} else {
    const idx = args.indexOf('--targetHtml');
    targetHtml = path.resolve(args[idx + 1]);
}
```

Если `--section` не найден (папка не существует), `targetHtml = null` → `injectFootnoteList({ docsDir, targetHtml: null, … })` → `fs.existsSync(null)` → `false` → `console.error('Не найден целевой HTML: null')`. Не падает, но сообщение кривое.

Если ни `--section`, ни `--targetHtml` не переданы — `section = null`, `idx = -1`, `args[0]` = первая команда. `path.resolve(args[0])` — какой-то путь. Не падает.

Правильно — проверять `if (idx === -1) { console.error('Нужен --section или --targetHtml'); process.exitCode = 1; }` — что **есть** в `footnoteList` ветке, но не в `gostsInject`.

### Кириллица в `argv` на Windows

`node cli.js gostsInject --section "ГОСТы"` — на Windows `cmd.exe` может передавать кириллицу в неправильной кодировке (`cp1251` вместо UTF-8). `process.argv` содержит искажённую строку, `findSectionIndexHtml` не находит папку, `targetHtml = null`.

Правильно — использовать `--targetHtml` напрямую или `chcp 65001` в обёртке.

### Нет общего `--help` / `--version`

`--version` не поддерживается. Пользователь не может узнать версию CLI. `package.json` → `1.54.0`, но CLI сам её не выводит.

### `docs-build.cmd` — только для Windows

```cmd
@echo off
node "%~dp0docs-build.js" %*
```

`%~dp0` — путь к `docs-build.cmd`. `%*` — все аргументы. Для Linux/macOS — надо `node ./docs-build.js` вручную (или `.sh`-обёртку). В `installer` копируется только `.js`, `.cmd` **не** копируется.

### `--docsDir` семантика — разная для разных команд

| Команда             | Что передаётся                   |
| ------------------- | -------------------------------- |
| `helpMap`           | `./docs` (корень, с `ru/`/`en/`) |
| `contexts`          | `./docs` (корень)                |
| `abbrs`             | `./docs` (корень)                |
| `reindexFigures`    | `./docs/ru` (корень **языка**)   |
| `reindexFootnotes`  | `./docs/ru` (корень **языка**)   |
| `footnoteNumbering` | `./docs/ru` (корень **языка**)   |
| `footnoteList`      | `./docs/ru` (корень **языка**)   |

То есть одна и та же `--docsDir` интерпретируется по-разному. Пользователь, привыкший `--docsDir ./docs`, при вызове `reindexFigures --docsDir ./docs` получит: `collectMdFilesByToc('./docs')` — а внутри `docs/` лежат `ru/` и `en/`, и `toc.yaml` в корне нет → `no_toc`. Молчаливый сбой.

### `process.exitCode` не сбрасывается между вызовами

Если пользователь запускает CLI несколько раз в одной Node-сессии (что редко, но возможно через `require`), `process.exitCode` сохраняется. Между разными модулями — конфликт.

Сейчас CLI запускается как отдельный процесс (`node cli.js …`), так что проблемы нет.