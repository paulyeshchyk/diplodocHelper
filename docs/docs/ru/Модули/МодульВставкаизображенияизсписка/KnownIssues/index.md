---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `workspaceFolders[0]` — мульти-workspace не поддерживается

```js
const rootDir = workspaceFolders[0].uri.fsPath;
```

В мульти-workspace (несколько папок открыто в VS Code) берётся **первая** папка, а не та, где находится `currentFilePath`. Если пользователь работает с проектом в третьей папке workspace, `collectAllImages` просканирует первую — и в `QuickPick` будут изображения из **другого** проекта.

Фикс — найти папку, содержащую `currentFilePath`:

```js
const folder = workspaceFolders.find(f => currentFilePath.startsWith(f.uri.fsPath));
const rootDir = (folder ?? workspaceFolders[0]).uri.fsPath;
```

### `!editor || languageId !== 'markdown'` — одно сообщение для двух случаев

Если редактора нет вообще — пользователь видит «Команду можно использовать только в Markdown-файлах». Это вводит в заблуждение: правильнее «Нет активного редактора».

Фикс — разделить:

```js
if (!editor) {
    vscode.window.showErrorMessage('Нет активного редактора');
    return;
}
if (editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage('Команда работает только в .md');
    return;
}
```

### `insert` в `selection.active` — выделение не заменяется

```js
await editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, markdownLink);
});
```

`selection.active` — «активная» позиция курсора (обычно правая граница выделения). Если пользователь выделил слово и вызвал `pasteImageFromList`, ссылка вставится **после** выделения, а выделение останется. Не то, что пользователь ожидает.

`link.Paste` (например) использует `replace(selectionRange, linkText)`, если выделение непустое. Здесь этого нет. См. «Известные ограничения».

Фикс — по образцу `link.Paste`:

```js
if (!editor.selection.isEmpty) {
    await editor.edit(eb => eb.replace(editor.selection, markdownLink));
} else {
    await editor.edit(eb => eb.insert(editor.selection.active, markdownLink));
}
```

### Нет `indentMultilinedText` — вставка в список ломает структуру

Если курсор внутри списка:

```md
- пункт списка
  |
```

`insert` добавит `![*caption*](relative)` без отступа. Получится:

```md
- пункт списка
![*caption*](relative)
```

Что не относится к списку. `image.PasteFromClipboard` использует `getCursorContext().listIndent` — здесь не используется. Нет `cursor.Context` в зависимостях модуля.

Фикс — добавить `getCursorContext` и `indentMultilinedText` (как в `image.PasteFromClipboard`).

### `editor.edit` без проверки результата

```js
await editor.edit(editBuilder => { … });
```

Возвращает `Promise<boolean>`. Не проверяется. Если `false` (документ readonly, например) — сообщение `«Вставлена ссылка»` всё равно показывается. Пользователь думает, что ссылка есть, а её нет.

### `caption` с `*` или `]` ломает markdown

```js
const markdownLink = `![*${selectedImage.caption}*](${relativeLink})`;
```

`caption` для `figure` — текст из `<figcaption>`. Если в нём есть `*` (например, `Рисунок 1. Формула *E=mc²*`), markdown-курсив сломается:

```md
![*Рисунок 1. Формула *E=mc²**](...)
```

Аналогично `]` в caption (например, `Свойства [объекта]`) — закроет alt-текст, всё сломается.

Фикс — экранировать `*` и `]`:

```js
const safeCaption = String(selectedImage.caption).replace(/([*\]\\])/g, '\\$1');
const markdownLink = `![*${safeCaption}*](${relativeLink})`;
```

Или — не оборачивать в `*…*` (курсив в alt-тексте — нестандартно, markdown это не всегда поддерживает).

### `extractFigureNumber` — фигуры без номера сортируются первыми

```js
const numA = extractFigureNumber(a.caption);   // 0 если нет "Рисунок N"
const numB = extractFigureNumber(b.caption);
if (numA !== numB) return numA - numB;
```

`0` < `1` → фигуры без номера идут **до** пронумерованных. Обычно пользователь ожидает **обратное**: сначала «Рисунок 1», «Рисунок 2», …, потом всё, что без номера.

Фикс:

```js
if (numA === 0 && numB === 0) return 0;   // оба без номера
if (numA === 0) return 1;                  // A без номера → в конец
if (numB === 0) return -1;
return numA - numB;
```

Не баг-в-баг, но UX-несоответствие ожиданиям.

### Дедупликация теряет информацию о второй статье

```js
if (!imageByNormalizedPath.has(key)) {
    images.push(image);
    imageByNormalizedPath.set(key, image);
}
```

Если одна и та же картинка использована в `foo.md` и `bar.md` (обе как `![alt](images/x.png)`), в `QuickPick` она появится **один раз** — с `filePath` из первого встреченного (в порядке обхода `FindMdFiles`, обычно недетерминированный).

Пользователь видит `description: 'foo.md'`, хотя картинка есть и в `bar.md`. При выборе вставится ссылка `../foo/images/x.png` — работает, но пользователь мог ожидать `../bar/images/x.png` (или обе в списке).

### `ExtractFigures`/`ExtractMdLinks` — последовательный обход

```js
for (const fileUri of mdFiles) {
    await ExtractFigures(fileUri.fsPath, …);
    await ExtractMdLinks(fileUri.fsPath, …);
}
```

Для каждого `.md` — **два** последовательных `fs.promises.readFile`. На проекте с 1000 `.md` — 2000 чтений файлов. Секунды на медленном диске.

Фикс — параллелить через `Promise.all`:

```js
await Promise.all(mdFiles.map(async (fileUri) => {
    await ExtractFigures(fileUri.fsPath, …);
    await ExtractMdLinks(fileUri.fsPath, …);
}));
```

Но тогда порядок в `images[]` недетерминированный — придётся сортировать после. Сортировка уже есть (по `type`/`num`/`caption`), так что результат стабилен.

### Нет `withProgress`

`collectAllImages` для 1000+ `.md` — секунды без индикатора. Пользователь видит «зависание». `showImagePicker` появляется только после полного обхода.

Фикс — `withProgress` вокруг `collectAllImages`:

```js
let images = [];
await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Сбор изображений…' },
    async () => { images = await collectAllImages(rootDir); }
);
```

### Кеш между вызовами отсутствует

Каждый вызов `pasteImageFromList` — полный обход `docs/`. Если пользователь вставляет несколько картинок подряд (копирует одну, потом другую) — каждый раз секунды ожидания.

Кеш можно было бы держать в `Map<rootDir, { images, timestamp }>` с TTL (например, 30 секунд) и инвалидировать по `onDidSaveTextDocument`/`onDidChangeTextDocument`. Не реализовано.

### Нет `link.Copy`-совместимости

`image.PasteFromList` вставляет `![*caption*](relative)` — **не** создаёт JSON в буфере. То есть после вставки через `image.PasteFromList` пользователь **не может** использовать `link.Paste` для повторной вставки той же ссылки. Придётся снова открывать `pasteImageFromList` и искать в списке.

Дизайн: `image.PasteFromList` — «одноразовая» вставка, `link.Copy` — «сохранить в буфер для повторного использования». Разделение явное, но UX-несоответствие.

### Сообщение об успехе — захардкожено на русском

```js
vscode.window.showInformationMessage(`Вставлена ссылка: ${selectedImage.caption}`);
```

Не через NLS. В `en`-локали VS Code пользователь увидит русский текст. `link.*`/`image.PasteFromClipboard` используют `translate(…)` — здесь забыто.

### `formatDetail` не локализован

```js
const formatDetail = (img) => {
    return img.type === 'figure'
        ? `Figure • ${img.id}`
        : `Изображение • ${path.basename(img.targetPath)}`;
};
```

`Figure` — английское, `Изображение` — русское. В одной строке. Смешение языков.

### `caption` для `figure` не очищается от markdown-форматирования

`extractFigcaptions` в `md.links.extract.js` вызывает `cleanCaption(match[2])`:

```js
function cleanCaption(text) {
    text = text.replace(/\[([^4]]*)\]\([^5]*\)/g, '$1');   // [text](url) → text
    text = text.replace(/<a[^6]*>([^7]*)<\/a>/g, '$1');    // <a>text</a> → text
    text = text.replace(/<[^6]+>/g, '');                   // остальные теги — удалить
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}
```

Удаляет markdown-ссылки и HTML-теги, но **не** удаляет `*`, `_`, `**`. Если caption содержит `**важное**`, в `label` останется `**важное**`, а в финальной markdown-ссылке — `![***важное***]` — сломается.

### Ссылка на `<figure>` идёт на `#id`, но id может быть невалидным

`figcaption` с `id="fig-…"` — по соглашению `buildFigureId`. Если пользователь создал `<figure>` вручную без `id` или с другим id (например, `id="my-figure"`), `ExtractFigures` найдёт, `image.id` = `'my-figure'`, ссылка будет `path#my-figure`. Работает, если `my-figure` уникален в документе. Если пользователь потом запустит `reindexer.figures` (которое переписывает `id` по шаблону `fig-<slug>`), старая ссылка сломается.

### Файл `image.PasteFromList` использует `collectAllImages` из `figures`-экстрактора, но не `figures`-каталога

`ExtractFigures` (в `md.links.extract.js`) и `walkMdFilesGetFigures` (в `figures.collector.js`) — две разные реализации. Первая — для QuickPick, вторая — для генерации каталога. Разные структуры, разные поля.

Одна и та же подпись `<figcaption>` обрабатывается дважды (независимо). Если в `figures`-логике появится улучшение (например, извлечение `alt` из `![]()`), в `image.PasteFromList` оно не подхватится.

### `FindMdFiles` без `try/catch`

```js
const mdFiles = await FindMdFiles(rootDir);
```

`vscode.workspace.findFiles` может бросить (например, если `rootDir` недоступен из-за прав). Исключение не поймано — VS Code покажет общую ошибку расширения.

### Нет проверки, что `currentFilePath` внутри `rootDir`

Если пользователь открыл `.md` вне workspace (например, `File → Open File` на файл в `/tmp/test.md`), `currentFilePath` — `/tmp/test.md`, `rootDir` — `workspaceFolders[0]`. `getRelativeLink` вычислит `../../../../docs/ru/foo.md` (много `..`). Вставится ссылка за пределы проекта — `@diplodoc/cli` не соберёт.

Фикс — проверять `currentFilePath.startsWith(rootDir)`; если нет — предупредить.