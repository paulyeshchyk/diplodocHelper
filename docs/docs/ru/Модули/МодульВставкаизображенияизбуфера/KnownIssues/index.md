---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### `insertIndentedBlock` удаляет текст на строке левее курсора

```js
const rangeToReplace = new vscode.Range(new vscode.Position(position.line, 0), position);
await editor.edit(editBuilder => {
    editBuilder.replace(rangeToReplace, formattedText);
});
```

`position` — `editor.selection.active` (курсор). `rangeToReplace` — от **столбца 0** строки до курсора. Всё, что было на строке левее курсора, **удаляется** и заменяется на `<figure>`-блок.

Сценарии:

| Было (курсор — ` | `)                | Ожидание                    | Реальность                                 |
| ---------------- | ----------------- | --------------------------- |
| `                | ` (пустая строка) | Вставка `<figure>`          | OK — `rangeToReplace` пуст                 |
| `                | ` (только отступ) | Вставка `<figure>` с indent | OK — отступ «съест» `indentMultilinedText` |
| `Текст           | `                 | Вставка после `Текст`       | `Текст` **удалён**, остаётся `<figure>`    |
| `# Заголовок     | `                 | Вставка на новой строке     | `# Заголовок` **удалён**                   |
| `- пункт списка  | `                 | Вставка с indent            | `- пункт списка` **удалён**                |

Это не атомарный «replace line start-to-cursor» — это «replace до курсора». Правильный подход:

- если пользователь на пустой строке / с отступом — заменить с 0 до курсора (как сейчас);
- если есть текст — вставить на новой строке: `insert` в `(position.line, line.text.length)` + `\n` или `position` как есть (без replace).

Сейчас модуль «работает» для типичного сценария (вставить на пустую строку), но **ломает содержимое**, если пользователь вызвал не там.

### Linux: `xclip` с `>` не работает

```js
function GetImageLinux() {
    let script = 'xclip';
    let args = ['-selection', 'clipboard', '-t', 'image/png', '-o', '>', tempPath];
    return { script, args };
}
```

`cp.execFile` **не** использует shell — это прямой `execve`. Аргумент `>` попадёт в `xclip` как литеральная строка `'>'`, а не как перенаправление. `xclip` попытается открыть файл `>` (не найдёт), и вернёт ошибку. Итог: на Linux `getImageFromClipboard` **не работает** — всегда `resolve(null)`, пользователь видит `«В буфере обмена нет изображения (или формат не поддерживается)»`.

Фикс:

```js
const args = ['-selection', 'clipboard', '-t', 'image/png', '-o'];
cp.execFile('xclip', args, (error, stdout) => {
    if (error) return resolve(null);
    resolve(Buffer.from(stdout, 'binary'));
});
```

или через `shell: true` + `>` (менее безопасно).

Плюс `-o` без перенаправления выводит в stdout — `stdout` в callback будет `Buffer` (с `encoding: null` или через `execFile` `encoding: 'buffer'`). Не `readFileSync(tempPath)`.

### `getImageFromClipboard` не проверяет наличие команды

`cp.execFile` при отсутствии `powershell`/`osascript`/`xclip` — `error` с `errno: 'ENOENT'`, `resolve(null)`. Пользователь видит `«В буфере обмена нет изображения»` — хотя проблема в отсутствии инструмента. Сообщение вводит в заблуждение.

Правильно — перед `execFile` проверить `command -v xclip` (или `which`), и если нет — `showErrorMessage('Установите xclip: sudo apt install xclip')`.

### `prompt: translate(screenshot.name.prompt)` — без подстановки

```js
const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);
const userInput = await vscode.window.showInputBox({
    prompt: translate(nls_ts.screenshot.name.prompt),   // ← без args
    value: defaultFilename,
    …
});
```

`prompt` — заголовок `InputBox`, показывает `"{0}_Скриншот"` (с литеральным `{0}`). `value` — предзаполненное поле, содержит `"2024-01-15_12-30-45_Скриншот"`. Пользователь видит «{0}_Скриншот» над полем и заполненное «2024-01-15_12-30-45_Скриншот» в поле. Непоследовательно.

Правильно — `prompt: 'Введите имя файла для скриншота'` (отдельный NLS-ключ) или `prompt: translate(..., timestamp)` (то же значение, что в `value`).

### `screenshot.*` — NLS-ключи из другого модуля

Все NLS-ключи начинаются с `screenshot.` (`screenshot.name.prompt`, `screenshot.saved.info`, `screenshot.error.notsaved` и т.д.). Но модуль называется `image.PasteFromClipboard`. В `package.nls.json` нет ключей `image.*` — используются существующие `screenshot.*`.

Историческое наследие: когда-то был отдельный модуль «вставка скриншота», потом его функциональность слилась с `image.PasteFromClipboard`. Ключи остались.

Практический эффект: если пользователь ищет в `package.nls.json` переводы для «вставки изображения», не найдёт — только `screenshot`. Если решишь переименовать — придётся менять и код, и NLS-файлы.

### `altText = userInput.trim()` — не очищен от спецсимволов markdown

Если пользователь введёт `Привет [мир]`, `altText = "Привет [мир]"`, а `figureBlock`:

```md
![Привет [мир]](./images/foo.png)
```

Markdown-парсер воспримет `[мир]` как начало ссылки. `]` внутри `alt` без экранирования ломает разметку. Аналогично с `)` внутри `alt` — закроет URL.

`buildFigure` не экранирует `altText`:

```js
const linkBlock = `![${altText}](${url})`;
```

Правильно — `altText.replace(/[\[\]]/g, …)` или использовать `slugify_latin_alphanumeric` для alt (но тогда потеряется читаемое имя).

`<figcaption>` тоже содержит `altText` как есть — там `[`, `]` безопасны (это HTML-текст), но markdown-ссылка выше сломается.

### `imageExtension` — константа, но `fileName` игнорирует

```js
const imageExtension = '.png';

// validateInput
const testPath = path.join(imagesDir, `${cleanName}${imageExtension}`);   // OK
// запись
const fileName = `${cleanName}.png`;                                       // ← hardcoded
```

Если кто-то изменит `imageExtension` на `.webp` — `validateInput` проверять будет `.webp`, а `fileName` запишет `.png`. Рассинхрон.

Правильно — везде `${cleanName}${imageExtension}`.

### Буфер всегда конвертируется в PNG

`getImageFromClipboard`:

- **Windows**: `$image.Save(tempPath, [ImageFormat]::Png)`;
- **macOS**: `clipboard as «class PNGf»` — приводит к PNG;
- **Linux**: `-t image/png` — запрашивает PNG.

Если пользователь скопировал JPEG (например, вставил из файла), буфер возвращает PNG (Windows/macOS конвертируют автоматически). Итог: файл `foo.png`, но исходник был `.jpg`. Это работает для документации (PNG без потерь), но:

- размер файла может быть больше оригинала;
- нет возможности сохранить оригинальный формат;
- если пользователь хотел `.jpg` — не получит.

### Создание `images/` — без учёта `_assets`

В Diplodoc статика обычно лежит в `_assets/`. Модуль создаёт `images/` рядом с `.md` — это **не** `_assets/`. `@diplodoc/cli` копирует `_assets/` в `build/_assets/`, но `images/` — нет. Изображения в `images/` попадают в `build/` только потому, что они referenced из `.md` (Diplodoc собирает все referenced ресурсы). Но если `.md` не упоминает картинку (например, удалили ссылку) — файл в `images/` «висит» и в `build/` не попадёт.

Плюс — если пользователь предпочитает `_assets/images/`, модуль этого не поддерживает. Путь захардкожен.

### `getCursorContext` — используется только `listIndent`

`getCursorContext` возвращает 6 полей (`isHtml`, `isList`, `listIndent`, `isDirectItem`, `isTable`, `isCustomBlock`, `isInsideBlockBody`, `isBlockHeader`, `blockType`). Модуль использует **только** `listIndent`.

Последствия:

- **внутри `<table>`** — вставка `<figure>` прямо в ячейку (HTML-таблица), что может сломать разметку;
- **внутри `{% note %}`** — вставка `<figure>` внутрь note, что синтаксически валидно, но не то, что ждёт пользователь;
- **внутри HTML-тега** — вставка `<figure>` внутрь `<figcaption>` или `<a href="…">` — сломает HTML.

Правильно — предупреждать, если `isTable` или `isHtml`, или отказывать в операции (как `link.addAnchor`).

### `Buffer` ограничен памятью

`fs.readFileSync(tempPath)` читает весь файл в память. Для типичного скриншота (100 KB–5 MB) — ок. Для видео или большого PNG (50 MB) — `Buffer` поместится, но `getImageFromClipboard` не проверяет размер. На крайнем случае — OOM.

Практически не встречается.

### `Timestamp` — UTC, не локальное время

```js
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
```

`toISOString()` — **UTC**. Для пользователя в UTC+3 скриншот в 12:30 локального времени получит timestamp `2024-01-15_09-30-45` (UTC). Пользователь ожидает локальное время.

Фикс:

```js
const now = new Date();
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
```

### Сообщение об успехе показывает `<slug>.png`, не введённое имя

```js
vscode.window.showInformationMessage(translate(nls_ts.screenshot.saved.info, fileName));
```

`fileName = <cleanName>.png`. Если пользователь ввёл `Привет Мир`, `cleanName = privet_mir`, сообщение — `«Картинка сохранена: privet_mir.png»`. Пользователь видит не то, что вводил. Не баг (это реальное имя файла), но требует знания про slugify.

### `editor.edit` — без проверки результата

```js
await editor.edit(editBuilder => { … });
```

Возвращает `Promise<boolean>`. Если `false` (документ readonly) — сообщение об успехе всё равно показывается. Пользователь думает, что скриншот вставлен, но в тексте ничего нет.

Фикс — проверять `applied` и показывать ошибку при `false`.

### `uri` из палитры — тихий выход через `!editor`

Как и в `link.*` — если команда вызвана из палитры без редактора, `showErrorMessage('Нет активного редактора')`. Разница с `section.*`/`link.*`: там `if (!uri) return;` — молча; здесь — с сообщением. Единообразия нет.

### `image.PasteFromClipboard` не проверяет, что курсор внутри `.md`-файла в папке проекта

`document.languageId === 'markdown'` — достаточная проверка для VS Code. Но если пользователь открыл `.md` вне `docs/` (например, `README.md` расширения), модуль создаст `images/` рядом с этим `README.md` — вне структуры Diplodoc. При следующей сборке `docs/` эти `images/` не попадут.

Правильно — `getLanguageRoot(document.uri.fsPath)` и предупреждать, если не внутри `docs/<lang>/`.