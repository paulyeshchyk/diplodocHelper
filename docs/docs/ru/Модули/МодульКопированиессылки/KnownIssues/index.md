---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `uri` из палитры — тихий выход

`if (!uri) return;` — команда видна в палитре (`Ctrl+Shift+P` → «Копировать ссылку на документ»), но без контекста Explorer ничего не делает. Пользователь ожидает диалог выбора файла, получает ничего.

Аналогично `section.*` командам — `when` в `package.json` разрешает вызов из палитры (нет `"when": "false"` в `commandPalette`). Единое решение для всех команд — запретить вызов из палитры через `commandPalette` или добавить `showOpenDialog` как fallback.

### `fs.statSync` без `try/catch`

```js
const stats = fs.statSync(fsPath);
```

Если файл/папка исчезли между кликом и вызовом (например, пользователь удалил папку через `section.Delete` в параллельном окне VS Code, а в этом окне Explorer ещё показывает кэш), `fs.statSync` бросит `ENOENT`. Исключение не поймано — VS Code покажет общую ошибку расширения.

Правильно — обернуть в `try/catch` и `showErrorMessage('Файл не найден: …')`.

### `buildTitle` не использует `title` из frontmatter

```js
const section = IndexMdFileRead(fsPath);
return section?.pureTitle || path.basename(fsPath);
```

Если `index.md` содержит только `title: 'Раздел 1. Введение'` (без `pureTitle`), то `section.pureTitle` — `undefined`, fallback — `path.basename(fsPath)` = `'Раздел1.Введение'` (имя папки без пробелов).

Пользователь ожидает скопировать ссылку на «Раздел 1. Введение», а в буфере `sourceLinkName: 'Раздел1.Введение'`. При вставке через `link.Paste` в текст статьи попадёт `[Раздел1.Введение](…)` вместо `[Раздел 1. Введение](…)`.

Правильный порядок — `pureTitle` → `title` → `basename`:

```js
const section = IndexMdFileRead(fsPath);
if (section?.pureTitle) return section.pureTitle;
if (section?.title) return section.title;
return path.basename(fsPath);
```

### `buildTitle` не убирает `.md` из имени файла

Для файла `foo.md` → `title = 'foo.md'`. При вставке `link.Paste` вставит `[foo.md](…/foo.md)` — в тексте ссылки будет видно расширение `.md`, что некрасиво.

Ожидаемое: `[foo](…/foo.md)` (без `.md` в тексте). Сейчас — с `.md`.

Если файл — картинка (`foo.png`), `title = 'foo.png'`. При вставке через `link.Paste` → `buildFigure(url, altText, id)` с `altText = 'foo.png'`. Не критично, но `altText` в `<figure>` будет с `.png`.

Правильно — убирать расширение для `.md`-файлов и оставлять как есть для картинок (или убирать `.png`, если альтернативный текст — «читаемое» имя).

### `when` не покрывает `.jpeg`, `.gif`, `.webp`

`isImage` (в коде) покрывает `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`. `when` в `package.json` — только `.png`, `.jpg`, `.svg`.

Практический эффект: на файле `.jpeg`, `.gif`, `.webp` команда **не видна** в контекстном меню. Пользователь не может скопировать ссылку на такую картинку — придётся идти в редактор, вставлять вручную.

Расширить `when` до `resourceExtname == .jpeg || resourceExtname == .gif || resourceExtname == .webp` — одна строка.

### `JSON.stringify(data)` без `\n` / indent

В буфере — однострочный JSON: `{"sourceLinkName":"Введение","sourceLinkPath":"C:\\…","isImage":false}`. С `\n` и indent было бы читаемо для человека, но `parseClipboardLink` (в `link.Paste`) и `canPasteMarkdownLink` (в `extension.js`) ожидают именно JSON.parse, и indent не сломает.

То есть **можно** печатать с indent для отладки (`console.log(clipboardText)` показывает содержимое). Сейчас — компактно. Не баг, но неудобно при отладке через «Developer: Inspect Clipboard».

### `isImage` — не влияет на поведение в этой команде

`isImage` кладётся в JSON, но `link.Copy` сам его не использует. Его использует `link.Paste`:

```js
if (isImage) {
    return shouldRenderAsHtml ? buildDocumentLink('!', linkName, mdPath, true) : buildImageLink(linkName, mdPath);
}
```

Значит, если пользователь копирует **папку**, в которой лежат **картинки** (а не `.md`), `isImage: false` — правильно (`buildTitle` читает `index.md`). Если копирует `.png` — `isImage: true`.

Но: если пользователь копирует `.md`, `isImage: false`, `sourceLinkName = 'foo.md'`. При вставке `link.Paste` пойдёт по ветке «не картинка» — `[foo.md](…/foo.md)`. Ок.

### `targetPath` — избыточная переменная

```js
let targetPath = fsPath;
let title = buildTitle(stats, fsPath);
const data = {
    sourceLinkName: title,
    sourceLinkPath: targetPath,
    …
};
```

`targetPath` — просто `fsPath`. Отдельная переменная не нужна. Возможно, планировалось что-то ещё (например, `fs.realpath` для симлинков), но не реализовано.

### Симлинки

`fs.statSync` следует по симлинкам. Если пользователь выбрал симлинк на папку, `fsPath` — путь к симлинку (не к цели). `IndexMdFileRead` попробует прочитать `<symlink>/index.md` — сработает (папка-цель имеет `index.md`). Но `sourceLinkPath` в JSON будет **симлинк-путь**, а не реальный. При вставке `link.Paste` вычислит относительный путь к симлинку — это может «не совпасть» с ожидаемым (например, если симлинк указывает за пределы `docs/`, относительный путь будет с `..`, который `@diplodoc/cli` не соберёт).

`fs.realpathSync(fsPath)` вместо `fsPath` — решило бы. Сейчас не делается.

### Сообщение не показывает путь

```js
vscode.window.showInformationMessage(translate('plugin.link.copy.info.success', title));
```

NLS: `"Ссылка на «{0}» скопирована в буфер"`. `{0}` = `title` (имя). Путь не упоминается. Если пользователь копирует папку «Введение», а таких папок в проекте несколько (в разных языках) — сообщение одинаковое. Пользователь не знает, какая именно папка в буфере.

Правильно — добавить `sourceLinkPath` в сообщение или в `detail` (но `showInformationMessage` не поддерживает `detail`, как `showWarningMessage` с `modal: true`).

### `link.Copy` не проверяет, что `fsPath` — `.md`, `.png` или папка

`when` в `package.json` фильтрует вызов. Но если `link.Copy` вызвать программно (например, из другой команды), она примет **любой** путь: `.yaml`, `.js`, `.css`. `isImage` вернёт `false`, `sourceLinkName` — имя файла. `link.Paste` потом вставит `[config.yaml](…/config.yaml)` в `.md` — что не имеет смысла.

`when` — единственная защита. Программный вызов — без защиты. Не критично (публичного API для `link.Copy` нет), но стоит документировать.

### Нет обработки длинных путей Windows (>260)

`fs.statSync` на пути > 260 символов на Windows бросит `ENAMETOOLONG`. `try/catch` нет — ошибка в консоль VS Code. Фикс — `toExtendedPath` (как в `figures.js`). Не реализовано.

### `sourceLinkPath` — абсолютный путь в JSON

При переносе проекта в другую папку (или другую машину) сохранённый JSON перестаёт работать: `sourceLinkPath` указывает на `C:\projects\…\docs\…`, а на новой машине — `/home/…/docs/…`. `link.Paste` попытается `path.relative` от текущего файла к несуществующему абсолютному пути — результат будет бессмысленный.

Практически: JSON из буфера используется в течение минуты (пока пользователь не переключился на целевой файл и не вставил). Долгосрочное хранение не предусмотрено. Но если пользователь случайно сохранил буфер в файл — это ловушка. Не баг текущего сценария.

### `link.Copy` — не идемпотентна «в хорошем смысле»

Повторный вызов на том же объекте перезаписывает буфер тем же JSON. Работает. Но если пользователь вызвал `link.Copy` на объекте A, потом `link.Copy` на объекте B, потом `Ctrl+V` в текстовом редакторе (не через `link.Paste`) — вставится JSON от B. Пользователь мог забыть, что копировал.

Дизайн: JSON в буфере — «ссылка для вставки через `link.Paste`», а не «текст для обычной вставки». Разделение явное, но требует знания. Если пользователь не знает про пару Copy/Paste — удивится, что `Ctrl+V` вставил JSON.