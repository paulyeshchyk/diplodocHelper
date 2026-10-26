---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `hasAnchor` не находит якоря Diplodoc

Проверка якоря — regex `/(?:id|name)\s*=\s*["']<anchor>["']/i`. Она находит только **inline HTML**:

```html
<div id="anchor"></div>
<a name="anchor"></a>
```

Но Diplodoc поддерживает markdown-якоря:

```md
## Заголовок {#anchor}
```

— здесь якорь задаётся через `{#anchor}`, и regex его **не найдёт**. То есть любая ссылка `[text](foo.md#anchor)` на такой заголовок будет помечена как «Невалидный якорь», хотя ссылка рабочая.

Список того, что `hasAnchor` **не** покрывает:

- `## Заголовок {#anchor}` (markdown-атрибут);
- `### Заголовок` — авто-якорь от заголовка (`#zagolovok`), Diplodoc генерирует его сам;
- `{@anchor name="…"}` (если используется).

Правильная проверка — использовать тот же `extractAnchorsFromMdFile` из `link.utils`, что и CodeAction. Но он **async** (читает файлы через `fs.promises`), а `lintInternalLinks` — синхронная. Переделка — переписать `lintInternalLinks` в async и вызывать `await` из `ux_linter_links`.

### Регулярка в `provideCodeActions` привязана к русскому тексту

```js
const match = diagnostic.message.match(/^Битая ссылка:\s*(.*)$/);
```

Если локализовать сообщение диагностики на английский (`'Broken link: …'`), регулярка не сработает — CodeAction не покажет кандидатов, «Заменить» не будет. NLS-файл `package.nls.json` не содержит ключа для этого сообщения — оно захардкожено в `ux_linter_links`:

```js
const message = err.severity === 'error'
    ? `Битая ссылка: ${displayLink}`
    : `Невалидный якорь: ${displayLink}`;
```

Для проекта на нескольких языках — сломается. Правильно — передавать `linkUrl` через `diagnostic.data` или отдельный реестр, а не парсить `message`.

### Кеш `cachedMdFiles`/`cachedRootDir` — глобальный

```js
let cachedMdFiles = [];
let cachedRootDir = '';
```

Живёт на уровне модуля. В многопроектном workspace (несколько папок в VS Code) при переключении между проектами `BrokenLinkCodeActionProvider` использует кеш от **предыдущего** проекта — `findCandidateFiles` ищет кандидатов в устаревшем `allMdFiles`. Симптом: «Заменить на предполагаемый файл» предлагает файлы из другого проекта.

Обнуляется только при следующем запуске `ux_linter_links`. `extension.js` не подписывается на `workspace.onDidChangeWorkspaceFolders` для сброса кеша.

### `lintInternalLinks` не проверяет `.md` вне `toc.yaml`

Если файл существует, но не упомянут в `toc.yaml` (или в `include`), он **не проверяется**. Это значит:

- ссылки **из** такого файла не проверяются;
- ссылки **на** такой файл всё равно проверяются (потому что `targetPath` ищется по FS, а не по списку), но если файл существует — ошибки не будет.

Практический эффект: на проекте с большим количеством `.md` вне навигации (например, «черновики» или `_drafts/`) линтер покажет меньше проблем, чем есть.

### Диагностическая коллекция — singleton, не сбрасывается при закрытии файла

```js
let diagnosticCollection = null;
function getDiagnosticCollection() {
    if (!diagnosticCollection) {
        diagnosticCollection = vscode.languages.createDiagnosticCollection('brokenLinks');
    }
    return diagnosticCollection;
}
```

Коллекция создаётся при первом запуске и живёт до конца сессии. Если пользователь откроет другой проект и запустит линтер — `clear()` очистит старые, но если не запустит — старые диагностики останутся в Problems **от предыдущего проекта**.

### `findCandidateFiles` не ищет по anchor

`brokenLink = '../missing.md#anchor'` → `linkPath = '../missing.md'`, `searchName = 'missing'`. Ищутся файлы с basename `missing`. Anchor (`#anchor`) при поиске **игнорируется**. То есть если есть `missing-v2.md` с нужным anchor — он может попасть в кандидаты, но anchor не будет проверен. Пользователь выберет его, `replaceLinkInContent` заменит `[text](../missing.md#anchor)` на `[text](../missing-v2.md)` **без anchor**. Ссылка «станет рабочей», но потеряет anchor.

Правильно — при формировании `newRelativePath` в `pickAndReplace` предлагать сохранять anchor из старой ссылки (или спрашивать). Сейчас `selectedAnchor` берётся из нового файла, а старый anchor игнорируется.

### `hasAnchor` не проверяет `id` с unicode-идентификаторами

`[^28]+` — символы, кроме кавычек, пробела и `>`. Если `id="якорь-с-кириллицей"` — regex работает (кириллица не входит в исключения). Но если `id="anchor with space"` (пробел внутри — невалидно в HTML, но встречается в «грязных» файлах) — regex обрежет на пробеле, `hasAnchor` вернёт `false`. Молча.

### `collectMdFiles` не проверяет `.yaml` в `items`

`item.href` с `foo/toc.yaml` или `foo/index.yaml` — игнорируется (`if (href.endsWith('toc.yaml') || href.endsWith('index.yaml')) continue;`). Логично: это не `.md`. Но если кто-то ссылается на `index.yaml` в markdown (что нестандартно, но возможно через `[text](index.yaml)`) — линтер не проверит существование файла.

### `getLineAndCharacter` считает character по байтам, не по code units

```js
const lines = text.slice(0, index).split('\n');
const character = lines[lines.length - 1].length;
```

`index` — индекс символа в строке (code units в JS). `.length` тоже в code units. Для BMP-символов (кириллица, латиница) — корректно. Для суррогатных пар (эмодзи) — `character` будет указывать не туда (VS Code ждёт code units, JS тоже использует code units, так что **совпадает**). Единственный риск — если текст содержит `\r\n` (Windows): `split('\n')` даёт строки, заканчивающиеся на `\r`, `character` считается с учётом `\r`, а VS Code ждёт позицию без `\r`. Может сдвинуть подсветку на 1 символ.

### `docs-build.js` не блокируется на битых ссылках

Линтер не участвует в сборке. Если в документации 50 битых ссылок — сборка пройдёт, `docs-build.js` не упадёт. Возможно, стоит добавить шаг «линтер в CI-режиме» (без UI, `exit code 1` при ошибках) — но это уже другой модуль, не этот.