---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### Нет Diagnostic-ов — только QuickPick

В отличие от `linter.links`, результат `linter.abbrs` не попадает в панель Problems. Это значит:

- нельзя «фильтровать» по файлу;
- нельзя «переходить по Tab» из Problems;
- нельзя интегрировать в CI через `vscode.Diagnostic`-механизм (если бы был headless-режим).

Пользователь видит список только пока открыт `QuickPick`. Закрыл — забыл. Для ревью перед релизом может быть неудобно (нет «постоянной» видимости).

Причина — дизайн-выбор: много `<abbr>` в тексте, диагностики на каждую — визуальный шум. Но если пользователь часто ловит «сирот», стоило бы сделать Diagnostics **по запросу** (например, флаг в конфиге — показывать ли диагностики).

### `resolveDocsRoot` — общая функция, дублируется в двух модулях

В `linter.abbrs` и `linter.terms` — одинаковая функция `resolveDocsRoot(uri)`, скопированная в оба файла. Изменение в одном не подхватится в другом. Стоит вынести в `utils/path.directory` или `utils/docsRoot.js`.

### `languages: ['ru', 'en']` — захардкожено

`lintAbbrs(docsRoot, options)` принимает `options.languages`, но VS Code-команда вызывает без `options`:

```js
await vscode.window.withProgress(…, async () => {
    issues = lintAbbrs(docsRoot);
});
```

То есть всегда `['ru', 'en']`. Если добавится `de` — линтер его не проверит (молча).

### `SKIP_DIRS` захардкожен

```js
const SKIP_DIRS = new Set(['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);
```

Глобально по имени, не по пути. Если у пользователя есть папка `figures/` с обычными статьями — они не будут проверены. То же для `contexts/`, `helptags/`, `roadmap/`.

С одной стороны, это защищает от «ложных срабатываний» на выходной папке `abbrs/` (её `index.md` содержит `<abbr data-abbr="…">` для каждой записи — проверять бессмысленно). С другой — если пользователь по своим причинам создал `docs/ru/figures/my-article.md` — он выпадет из проверки.

### `<abbr>` внутри код-блоков **не** проверяются, но `<abbr>` в HTML тоже нет

`lintFile` ищет `<abbr>…</abbr>` по всему `.md`, включая `.md`-блоки кода (```` ```html ... ``` ````). Это даёт ложные срабатывания: если в примере кода есть `<abbr>ИСО</abbr>`, а в словаре `ИСО` нет — линтер покажет «не найдено», хотя это **пример кода**, а не использование в статье.

Правильно — `maskCodeInMarkdown` перед regex-поиском (как в `extractAbbrsFromFile` из `abbrs.extractor`). Сейчас `linter.abbrs` этого не делает — расхождение с `extractor`-ом.

### `line`/`character` — позиция начала `<abbr>`, не `<abbr>`-контента

`offsetToPosition(content, m.index)` — где `m.index` — индекс `<` в `<abbr>`. То есть `line/character` указывают на `<abbr>`, а не на текст внутри. `revealRange(new vscode.Range(pos, pos))` — курсор окажется в позиции `<`. Работает, но если пользователь ожидает попасть в середину слова — нет.

### `hasAbbr`-проверка чувствительна к регистру

`dictionary.has(lookupAbbr)` — точное совпадение `abbr` из YAML и `<abbr>`-ключа. `ИСО` ≠ `исо`. Если в статье `<abbr>исо</abbr>`, а в словаре `abbr: ИСО` — линтер покажет «не найдено», хотя `abbrs.dictionary.writer` добавляет записи с `abbr` как есть (с учётом регистра).

Пользователь может решить, что «надо переименовать» — но в словаре запись уже есть, просто в другом регистре. У `abbr.Add` (CodeAction) есть подсказка «без учёта регистра» — но **линтер** этой нормализации не делает.

### `QuickPick` с `label: $(warning) abbr` — не локализован

`$(warning)` — иконка Codicon, работает. Но `placeHolder`:

```js
const placeHolder = translate(nls_ts.plugin.linter.abbrs.pick.placeholder, issues.length);
```

Использует NLS-перевод. В `package.nls.json` есть ключ `plugin.linter.abbrs.pick.placeholder`: `"Not defined in dictionary: {0}. Choose to jump to file."` — то есть переводится.

Ок, здесь претензий нет.

### `languages` не влияет на `docsRoot`

`resolveDocsRoot(uri)` находит `docs/`, а `lintAbbrs` сам разбивает на языки. Если у пользователя структура `docs/ru/...`, `docs/en/...`, но `docs/de/...` — `linter.abbrs` проигнорирует `de` (не в списке). Если структура другая (например, `docs/docs-ru/`) — `resolveDocsRoot` не найдёт папку с basename `docs`, вернёт `workspaceFolders[0] + '/docs'` — и линтер ищет `docs/ru/`, которых нет. Тихо: `issues = []`, info «Все сокращения определены».

### `withProgress` блокирует UI

`withProgress` без `cancellable: true` — пользователь не может отменить линтер, даже если он работает минуту на 1000+ статей. `cancellable: false` (по умолчанию). Для типичного проекта — секунды, не критично. Для большого — неприятно.