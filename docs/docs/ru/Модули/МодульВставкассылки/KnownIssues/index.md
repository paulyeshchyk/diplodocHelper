---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### Критический баг `isImage = ext !== 'md'`

```js
const ext = path.extname(targetFilePath);   // для 'foo.md' → '.md' (с точкой)
// …
isImage = ext !== 'md';                     // '.md' !== 'md' → true
```

`path.extname` возвращает расширение **с точкой**: `.md`, `.png`, `.yaml`. Сравнение с `'md'` (без точки) всегда даёт `true`. То есть `isImage = true` для **любого файла**.

Последствия:

1. **`.md`-файлы вставляются как `<figure>`** с `<figcaption>`, а не как `[text](url)`.
2. **Папки** обрабатываются корректно (`if (!isDirectory)` исключает папки из проверки `isImage`).
3. **Якоря не предлагаются** для `.md`-файлов — `if (!isImage)` пропускает их.

Симптом пользователя: скопировал `.md`, вставил — получил `<figure>` с картинкой-плейсхолдером и текстом вместо ссылки.

Фикс — одна строка:

```js
isImage = ext !== '.md';
```

Или — использовать `data.isImage` из JSON (см. ниже).

### `data.isImage` из JSON игнорируется

[`link.Copy`](../МодульКопированиессылки/index.md) кладёт `isImage` в JSON:

```js
isImage: /\.(png|jpe?g|gif|svg|webp)$/i.test(fsPath),
```

`link.Paste` **не** читает его:

```js
const { isDirectory, isImage } = await getFileTypeInfo(targetFilePath);
```

`getFileTypeInfo` пересчитывает `isImage` через `fs.stat` + `path.extname` (с багом выше). Данные из JSON теряются.

Правильный подход — доверять `data.isImage`, если он есть:

```js
const { isDirectory } = await getFileTypeInfo(targetFilePath);
const isImage = (data.isImage !== undefined) ? data.isImage : await guessIsImage(targetFilePath);
```

Это устранило бы и баг выше — для `.md`-файлов `data.isImage === false`, и всё работало бы. Даже с багом `ext !== 'md'`, потому что JSON перекрыл бы `isImage`.

### `fs.stat` при удалённом файле — тихая ошибка

Если целевой файл был удалён между `link.Copy` и `link.Paste`, `getFileTypeInfo`:

```js
try {
    const stat = await fs.stat(targetFilePath);
    // …
} catch {
    if (!ext) isDirectory = true;
}
```

`catch` не сообщает о проблеме. `isDirectory = false`, `isImage = false` (по умолчанию) → идёт в markdown-ветку. `extractAnchorsFromMdFile` попробует прочитать файл — `[]`. Ссылка вставится **битой**, никакого сообщения.

Правильно — `throw` или `showWarningMessage('Целевой файл не найден: …')`.

### Дублирование `extractAnchorsFromMdFile`, `promptAnchorSelection`, `calculateRelativeMdPath`, `generateSlug`

Все четыре функции определены **и** в `link.Paste.js`, **и** в `link.utils.js`. Функционально идентичны, но:

- `link.Paste` использует свои копии;
- `link.utils` — используется линтером (`vscode.linter.links.picker.js`).

Реальное расхождение:

| Функция                    | `link.Paste`                            | `link.utils`                       |
| -------------------------- | --------------------------------------- | ---------------------------------- |
| `promptAnchorSelection`    | 1 аргумент, `translate(nls_ts…)` внутри | 2 аргумента, `translateFn` передан |
| `calculateRelativeMdPath`  | идентична                               | идентична                          |
| `extractAnchorsFromMdFile` | идентична                               | идентична                          |
| `generateSlug`             | идентична                               | идентична                          |

Если в одной из них появится баг или улучшение — вторая не узнает. Стоит вынести в один модуль (например, `link.utils`) и импортировать.

### `isCursorInsideHtmlTag` — мёртвый код (~80 строк)

Функция определена в `link.Paste.js`, но **не вызывается**. `ux_link_paste` использует `getCursorContext(editor).isHtml` (stack-based парсер HTML).

`isCursorInsideHtmlTag` — наивная реализация (поиск `<` слева, `>` справа на текущей строке). Работает хуже, чем `getCursorContext.isHtml`. Удалить.

### HTML-ветка: `mdPath` без ведущего `/`

```js
mdPath = segments.map(s => encodeURIComponent(s)).join('/');
```

Для страницы `docs/ru/foo/index.md`, ссылки на `docs/ru/bar/index.md` → `mdPath = 'ru/bar/index.html'` (без `/`).

В `buildDocumentLink` для HTML:

```js
return `<a href="${mdPath}">${sourceLinkName}</a>`;
```

`href="ru/bar/index.html"` — **относительный** путь. Браузер будет искать `…/ru/foo/ru/bar/index.html`. Не найдёт.

Правильно — `/${mdPath}` или полный URL (`https://docs.example.com/ru/bar/index.html`).

Но возможно, автор подразумевал, что HTML-блок будет в `build/`-корне (например, `<iframe>`), где относительно корня — ок. Это зависит от контекста. Отмечаю как «потенциальный баг».

### Вставка внутри существующей markdown-ссылки не отсекается

`link.Paste` не проверяет `isInsideMarkdownLink` (в отличие от `link.addAnchor`). Если пользователь внутри `[existing](url)` вызовет `link.Paste` без выделения — получит `[existing]([new](url2))` — сломанный markdown. Или с выделением `existing` — `[existing]([new](url2))`.

Правильно — добавить проверку `isInsideMarkdownLink` (как в `link.addAnchor`) и предупредить.

### `promptAnchorSelection` не находит `{@anchor}`

`extractAnchorsFromMdFile` ищет:

- markdown-заголовки (`## …`);
- `id="…"` (regex);
- `<a name="…">` (regex).

**Не находит**:

- `{@anchor name="…"}` — YFM-разметка;
- `<a id="…">` — старая разметка (только `name=` ищется);
- заголовки без `{}` (авто-слаг из `## Введение` → `#vvedenie`) — **находит** через `generateSlug`.

### `getTargetMdFile` для папок без `index.md`

```js
function getTargetMdFile(targetFilePath, isDirectory) {
    if (isDirectory) {
        return path.join(targetFilePath, INDEX_MD);
    }
    // …
}
```

Не проверяет `fs.existsSync`. Если папка без `index.md` (например, `docs/ru/images/`), вернёт `docs/ru/images/index.md`. `extractAnchorsFromMdFile` попробует прочитать — `catch`, `[]`. Якоря не предлагаются.

### `uri` из палитры — тихий выход

Как и в остальных `link.*`/`section.*`. `if (!editor) return;` — если команда вызвана из палитры без активного редактора. Но `when` (`editorTextFocus`) это блокирует.

### `encodeURIComponent` — потеря читаемости при отладке

Кириллица кодируется: `Раздел1.Введение` → `%D0%A0%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB1.%D0%92%D0%B2%D0%B5%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5`. Работает (Diplodoc сам декодирует), но при ручной отладке ссылки в `.md` — нечитаемы.

### `listIndent` для выделения не применяется

Если у пользователя есть выделение **внутри списка**, `hasSelection = true` → `editor.edit` вызывает `replace(selectionRange, linkText)` без indent. Если пользователь выделил пустой текст (несколько пробелов) — indent не нужен, всё ок. Если выделил реальный текст — replace заменяет его ссылкой на тех же позициях, indent не нужен.

Но если пользователь вставляет **без выделения** внутри списка — `insert` с indent. Если выделение **пустое**, но есть `listIndent > 0` — тоже indent. Логика согласована.

### `workspaceRoot` — берётся первая папка

```js
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
```

В мульти-workspace (несколько папок открыто в VS Code) — берётся **первая**, не та, где находится `sourceFilePath`. Результат `relativeFromRoot` может быть неверным.

Правильно — найти папку-workspace, содержащую `sourceFilePath`:

```js
const workspaceRoot = vscode.workspace.workspaceFolders
    ?.find(f => sourceFilePath.startsWith(f.uri.fsPath))
    ?.uri.fsPath;
```

### `linkName` с `]` ломает markdown

Если `linkName` (из `sourceLinkName` в JSON) содержит `]` (например, `pureTitle: "Формула [E=mc²]"`), в markdown-ссылке `[Формула [E=mc²]](url)` — сломается. `link.Copy` не очищает `]` из `pureTitle`.

### Параметр `index` в `indentMultilinedText` не используется

```js
.map((line, index) => { … })
```

`index` не используется внутри. Минорный warning ESLint. Не критично.

### `error.emptybuffer` — недостижим в норме

```js
if (data === null || !data.sourceLinkPath || !data.sourceLinkName) {
    throw new Error(translate('plugin.link.paste.error.emptybuffer'));
}
```

В `when` (`canPasteMarkdownLink`) проверяется `parseClipboardLink(clipboardText) !== null`. То есть если буфер не JSON, команда не видна. Значит `data === null` в норме недостижимо.

Но: `parseClipboardLink` возвращает `null` только при `JSON.parse`-исключении. Если JSON — `{}` (без полей), `parseClipboardLink` вернёт `{}` (не `null`), `canPasteMarkdownLink` вернёт `true` (объект ≠ null), команда будет видна. При вставке `ConvertDocumentPathToLink` упадёт на `!data.sourceLinkPath` → `error.emptybuffer`.

То есть проверка нужна, но сообщение «буфер пуст» неточное — правильнее «в буфере не Diplodoc-ссылка».

### Нет подтверждения при перезаписи

Если пользователь выделил текст и вставил ссылку — выделение заменится безвозвратно. `Ctrl+Z` вернёт. Но никакого «вы уверены?» — стандартное поведение редактора, не баг.

### `sourceLinkPath` может быть относительным

`link.Copy` пишет абсолютный путь (`uri.fsPath`), но если пользователь вручную скопировал JSON с относительным путём (или с путём из другой ОС — `C:\…` на Linux), `fs.stat` бросит, `getFileTypeInfo` → `isDirectory = false`, `isImage = false`. Ссылка вставится с неверным путём.

Никакой валидации формата `sourceLinkPath` нет.