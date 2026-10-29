---
title: Перечень иллюстраций
sectionType: Page
---

# Перечень иллюстраций

<div class="figures-view-switch" role="tablist">
  <button type="button" data-figures-view="list" aria-pressed="true">Список</button>
  <button type="button" data-figures-view="grid" aria-pressed="false">Сетка</button>
</div>

<div class="figures-container" data-view="list">
<table class="figures-table">
<thead>
<tr>
  <th class="fig-num">№ п/п</th>
  <th class="fig-title">Название иллюстрации</th>
  <th class="fig-preview">Предпросмотр</th>
</tr>
</thead>
<tbody>
<tr>
  <td class="fig-num">1</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/index.html#fig-…">`.

Без модуля пришлось бы:

1. Сохранить скриншот в файл (через системный редактор).
2. Найти нужную папку `images/`, перенести файл, придумать имя.
3. Открыть `.md`, написать `![alt](images/foo.png)`.
4. Обернуть в `` + `` — иначе `reindexer.figures` не пронумерует, `figures` не соберёт в каталог, тултипы не появятся.

Модуль делает это за одно действие. Ограничение — работает только при наличии графической сессии (без `DISPLAY`/`SESSIONNAME` — `getImageFromClipboard` вернёт `null`).

## Применение

**Когда использовать:** в буфере — свежий скриншот, и нужно вставить его в `.md` как `` с превью и `` для `figures`/`reindexer.figures`.

**Когда НЕ использовать:** буфер содержит текст; Linux без `xclip`; нужна ссылка на уже существующую картинку — `image.PasteFromList`.

**Альтернативы:**
- Сохранить скриншот в файл, потом `![](…)` + `` вручную — долго.
- `image.PasteFromList` — не работает с буфером, только с существующими.

**Типичный сценарий:** сделать скриншот → в `.md` **Diplodoc → Вставить рисунок из буфера обмена** → ввести имя → картинка в `images/` + ``-блок.

## Как это работает

```mermaid
flowchart TB
    subgraph entry[VS Code]
        CMD[&quot;UX: pasteImageFromClipboard&quot;]
        ED[&quot;activeTextEditor&quot;]
        CHK1[&quot;languageId === 'markdown'&quot;]
    end
    subgraph clip[Буфер обмена]
        OS[&quot;os.platform()&quot;]
        WIN[&quot;powershellGetImage&quot;]
        MAC[&quot;osascriptclipboard as PNGf&quot;]
        LIN[&quot;xclip-t image/png&quot;]
    end
    subgraph prompt[Диалог]
        INPUT[&quot;showInputBox(имя файла)&quot;]
        SAN[&quot;slugify_latin_alphanumeric&quot;]
    end
    subgraph fs[Файлы]
        MKDIR[&quot;mkdir images/&quot;]
        WRITE[&quot;writeFileSync&quot;]
        IMGPATH[&quot;images/&amp;lt;slug&amp;gt;.png&quot;]
    end
    subgraph build[Сборка]
        FIG[&quot;buildFigure(figure + figcaption)&quot;]
        CTX[&quot;getCursorContext(listIndent)&quot;]
    end
    subgraph insert[Вставка]
        INS[&quot;insertIndentedBlock&quot;]
        FINAL[&quot;&amp;lt;figure&amp;gt;…&amp;lt;/figure&amp;gt;&quot;]
    end
    CMD --&gt; ED
    ED --&gt; CHK1
    CHK1 --&gt; OS
    OS --&gt; WIN
    OS --&gt; MAC
    OS --&gt; LIN
    WIN --&gt; INPUT
    MAC --&gt; INPUT
    LIN --&gt; INPUT
    INPUT --&gt; SAN
    SAN --&gt; MKDIR
    MKDIR --&gt; WRITE
    WRITE --&gt; IMGPATH
    IMGPATH --&gt; FIG
    FIG --&gt; CTX
    CTX --&gt; INS
    INS --&gt; FINAL
```

### Фаза 1. Проверка контекста

```js
const editor = vscode.window.activeTextEditor;
if (!editor) {
    vscode.window.showErrorMessage(translate(nls_ts.paste.image.error.noactiveeditor));
    return;
}

const document = editor.document;
if (document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.mdfileonly));
    return;
}
```

Две проверки:

1. **Редактор** — если `undefined`, ошибка `«Нет активного редактора»`. В норме недостижимо: команда видна только при `editorTextFocus`.
2. **Язык** — `markdown`. На других языках — предупреждение `«Команда может использоваться только в .md файлах»`.

### Фаза 2. Чтение буфера (`getImageFromClipboard`)

```js
const clipboardImage = await getImageFromClipboard();
if (!clipboardImage) {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.emptybuffer));
    return;
}
```

`getImageFromClipboard` (из `utils/clipboard.image.js`) — `Promise`:

1. **`os.platform()`** — определяет ОС.
2. **Temp-файл** — `path.join(os.tmpdir(), \`vscode_clip_${Date.now()}.png\`)`.
3. **OS-команда** (через `cp.execFile`):
   - **Windows**: `powershell -NoProfile -NonInteractive -Command &quot;Add-Type … GetImage(); $image.Save(tempPath, PNG); exit 0&quot;`;
   - **macOS**: `osascript -e 'write (the clipboard as «class PNGf») to (open for access POSIX file &quot;tempPath&quot; with write permission)'`;
   - **Linux**: `xclip -selection clipboard -t image/png -o &gt; tempPath`.
4. **Ожидание** — `execFile` запускает команду, ждёт `callback`.
5. **Чтение** — если `error` → удалить temp, `resolve(null)`; иначе `fs.readFileSync(tempPath)`, `fs.unlinkSync(tempPath)`, `resolve(buffer)`.

Внешние зависимости — `xclip` (Linux), `osascript` (macOS), `powershell` (Windows). На любой ошибке (нет `xclip`, буфер пуст, нет `DISPLAY`, таймаут) — `resolve(null)`.

### Фаза 3. Диалог имени файла

```js
const mdDir = path.dirname(document.uri.fsPath);
const imagesDir = path.join(mdDir, 'images');

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);

const userInput = await vscode.window.showInputBox({
    prompt: translate(nls_ts.screenshot.name.prompt),
    placeHolder: translate(nls_ts.screenshot.description.placeholder),
    value: defaultFilename,
    validateInput: value =&gt; { … },
});

if (!userInput) return;
```

1. **`mdDir`** — папка текущего `.md`.
2. **`imagesDir`** — `/images/`. Создаётся, если нет (`fs.mkdirSync(recursive: true)`).
3. **`timestamp`** — `new Date().toISOString()` (`2024-01-15T12:30:45.123Z`) → замена `:`/`.` на `-` → замена `T` на `_` → `slice(0, 19)` → `2024-01-15_12-30-45`.
4. **`defaultFilename`** — `translate(screenshot.name.prompt, timestamp)` — подставляет `{0}` → `2024-01-15_12-30-45_Скриншот` (ru) или `2024-01-15_12-30-45_Screenshot` (en).
5. **`InputBox`**:
   - `prompt: translate(screenshot.name.prompt)` — **без** подстановки → `&quot;{0}_Скриншот&quot;` (литерально);
   - `placeHolder: translate(screenshot.description.placeholder)` — `«Описание_скриншота»`;
   - `value: defaultFilename` — предзаполненное;
   - `validateInput` — три правила (см. ниже).

`validateInput`:

```js
validateInput: value =&gt; {
    if (!value || value.trim().length === 0) {
        return 'Имя не может быть пустым';
    }
    const cleanName = slugify_latin_alphanumeric(value);
    if (cleanName.length === 0) {
        return translate(nls_ts.screenshot.name.error.wrongcharacters);
    }
    const testPath = path.join(imagesDir, `${cleanName}${imageExtension}`);
    if (fs.existsSync(testPath)) {
        return translate(nls_ts.filename.error.alreadyexists);
    }
    return null;
},
```

- пустое → `«Имя не может быть пустым»` (захардкожено, не NLS);
- `slugify_latin_alphanumeric(value) === ''` → `«Имя содержит недопустимые символы»`;
- файл `images/.png` уже существует → `«Файл с таким именем уже существует»`.

`imageExtension = '.png'` — константа в начале файла.

### Фаза 4. Запись файла

```js
const cleanName = slugify_latin_alphanumeric(userInput);
const fileName = `${cleanName}.png`;
const imagePath = path.join(imagesDir, fileName);

try {
    if (fs.existsSync(imagePath)) {
        throw new Error(translate(nls_ts.screenshot.error.alreadyexists.async));
    }

    fs.writeFileSync(imagePath, clipboardImage);

    let relativePath = path.relative(mdDir, imagePath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }
    // …
```

1. **`cleanName`** — slugify от `userInput` (`Привет Мир!` → `privet_mir`).
2. **`fileName`** — `${cleanName}.png` (жёстко `.png`, а не `imageExtension`).
3. **`imagePath`** — `images/.png`.
4. **Проверка на существование** — если файл уже есть (race condition после `validateInput`), `throw` `«Файл был создан параллельно и уже существует»`.
5. **`fs.writeFileSync`** — запись буфера.
6. **`relativePath`** — `path.relative(mdDir, imagePath)` (`images/foo.png` или `../foo/images/foo.png`), нормализация `\` → `/`, добавление `./`-префикса.

### Фаза 5. Сборка ``

```js
const altText = userInput.trim();
const customId = buildFigureId(cleanName);
const figureBlock = buildFigure(relativePath, altText, customId);
```

- **`altText`** — `userInput.trim()`, **не** `cleanName`. То есть alt в markdown-ссылке — с кириллицей и пробелами (`Привет Мир!`), а `id` — на латинице (`fig-privet_mir`). См. «Известные ограничения».
- **`customId`** — `fig-` (не ``, а `fig-`).
- **`figureBlock`** — `\n\n![alt](url)\n\nalt</a></td>
  <td class="fig-preview"><span class="fig-preview-empty">—</span></td>
</tr>
<tr>
  <td class="fig-num">2</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/index.html#fig-skrinshot_nastrojki">Скриншот настройки</a></td>
  <td class="fig-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/images/skrinshot_nastrojki.png" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/images/skrinshot_nastrojki.png" alt="Скриншот настройки" class="js-lightbox-trigger fig-preview-img" loading="lazy" /></td>
</tr>
<tr>
  <td class="fig-num">3</td>
  <td class="fig-title"><a href="/ru/known-issues-summary.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}

```js
const wrappedText = `${selectedText}`;
```

`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a></td>
  <td class="fig-preview"><img data-src="/ru/relative" data-full-src="/ru/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}

```js
const wrappedText = `${selectedText}`;
```

`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-preview-img" loading="lazy" /></td>
</tr>
<tr>
  <td class="fig-num">4</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-module.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a></td>
  <td class="fig-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-preview-img" loading="lazy" /></td>
</tr>
<tr>
  <td class="fig-num">5</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-severity.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a></td>
  <td class="fig-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-preview-img" loading="lazy" /></td>
</tr>
<tr>
  <td class="fig-num">6</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-type.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a></td>
  <td class="fig-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-preview-img" loading="lazy" /></td>
</tr>
<tr>
  <td class="fig-num">7</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%98%D0%BB%D0%BB%D1%8E%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D0%B8/index.html#…">`), генерирует уменьшенные превью каждого изображения через `sharp` и строит страницу-каталог с таблицей иллюстраций: номер, название, мини-превью, ссылка на полноразмерный оригинал.

Практический смысл: техписатель или читатель видит все иллюстрации в одной таблице с быстрым переходом к исходной статье и полноразмерному изображению. Номера иллюстраций идут в порядке появления в документе — совпадают с нумерацией, которую проставляет `reindexFigures` (отдельный модуль `reindexer/reindexer.figures.js`).

Модуль работает исключительно в `pre-processing` — генерирует `docs/**/figures/index.md` с встроенной HTML-разметкой. Клиентской части нет: переключатель list/grid и лайтбокс подразумеваются разметкой, но требуют внешних скриптов темы (см. «Известные ограничения»).

## Применение

**Когда использовать:** в документации десятки+ иллюстраций, и нужен каталог «все рисунки в одном месте» с превью, номерами и ссылками на исходные статьи.

**Когда НЕ использовать:** 2–3 картинки — хватит обычного списка; нужен только список для вставки — используйте `image.PasteFromList` (не генерирует каталог).

**Альтернативы:**
- Ручной `figures/index.md` — рассинхронизируется.
- Только `reindexer.figures` — нумерует, но не собирает каталог.

**Типичный сценарий:** `docs-build.js` → `pre` → `reindexFigures` (нумерация) → `createFigureContent` (`figures` собирает каталог с превью через `sharp`).

## Как это работает

```mermaid
flowchart TB
    subgraph md[Исходники]
        MD[&quot;docs/**/*.md&quot;]
        IMG[&quot;docs/**/images/*.png&quot;]
    end
    subgraph pre[Pre-processing]
        EXT[&quot;extractorextractFiguresFromFile&quot;]
        COL[&quot;collectorwalkMdFilesGetFigures&quot;]
        THUMB[&quot;sharpcreateThumbnail&quot;]
        WRI[&quot;writerwriteFigureList&quot;]
    end
    subgraph out[Выход]
        IDX[&quot;figures/index.mdtoc.yamlindex.yaml&quot;]
        THUMBS[&quot;figures/thumbs/*.webp&quot;]
    end
    MD --&gt; EXT
    EXT --&gt; COL
    COL --&gt; THUMB
    COL --&gt; WRI
    IMG -.-&gt; THUMB
    THUMB --&gt; THUMBS
    WRI --&gt; IDX
```

1. **Извлечение.** `extractFiguresFromFile` читает `.md`, находит все ``, ищет ближайшее markdown-изображение **слева** от каждого ``. Возвращает `{ id, caption, imagePath, imageAlt, sourcePath, figureNumber }`, где `figureNumber` вытаскивается из `Рисунок N` / `Figure N` / `Fig. N` в тексте подписи.

2. **Сбор.** `walkMdFilesGetFigures` обходит `langDir`, пропускает `SKIP_DIRS` (`figures`, `contexts`, `helptags`). Собирает плоский массив записей по всем статьям.

3. **Превью.** `processThumbnails` для каждой записи с `imagePath` (не `http:`, не `data:`, не `//`):
   - резолвит абсолютный путь от директории `.md` + `imagePath`;
   - проверяет существование через `toExtendedPath` (обход MAX_PATH на Windows);
   - считает `md5`-хеш относительного пути (первые 12 символов) для имени превью;
   - через `sharp` ресайзит до ширины 360px с `fit: 'inside'` (без увеличения) и сохраняет `figures/thumbs/_.webp` (quality 80);
   - пропускает, если превью уже существует;
   - записывает в `fig.thumbPath` абсолютный URL вида `/ru/figures/thumbs/_.webp`.

4. **Запись.** `writeFigureList` сортирует по `figureNumber` (или алфавитно по `caption`, если номера нет), генерирует `index.md`:
   - frontmatter `title: Перечень иллюстраций` (`List of figures` для `en`);
   - переключатель `` (кнопки `Список` / `Сетка`);
   - `` — по умолчанию видима (`data-view=&quot;list&quot;`);
   - `` — второй вид того же набора;
   - каждая запись — `` с номером, названием (ссылка на `article.html#fig-…`) и ``;
   - `toc.yaml` / `index.yaml` — заголовок и `href`.

### Файлы модуля

| Файл                   | Ответственность                                 |
| ---------------------- | ----------------------------------------------- |
| `figures.js`           | `runGeneration(docsRoot)` — оркестратор (async) |
| `figures.collector.js` | `walkMdFilesGetFigures` — обход `docs/`         |
| `figures.extractor.js` | `extractFiguresFromFile`, `extractFigureNumber` |
| `figures.writer.js`    | `writeFigureList` — генерация `index.md`        |
| `figures.model.js`     | пустой (`module.exports = {}`)                  |

### Ожидаемая разметка в `.md`

```html


![Описание](./images/foo.png)

Рисунок 1. Описание</a></td>
  <td class="fig-preview"><span class="fig-preview-empty">—</span></td>
</tr>
<tr>
  <td class="fig-num">8</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D1%80%D0%B8%D1%81%D1%83%D0%BD%D0%BA%D0%BE%D0%B2/index.html#…">`:
   - очищает текущую подпись от `Рисунок N.` / `Figure N.` / `Рис. N.`;
   - ставит **сквозной** номер ` N. `;
   - запоминает `id → N` в глобальный `mapping`.
3. **Повторно идёт по файлам** — обновляет все ссылки `[текст](path#fig-)`:
   - находит новый номер в `mapping` по `` + ``;
   - пересчитывает `(рис. N)` / `(fig. N)` по шаблону из настроек.

Ключевое отличие от [`figures`](../МодульИллюстрации/index.md): `figures` **собирает** иллюстрации в каталог `figures/index.md`, а `reindexer.figures` **меняет** `.md`-файлы — нумерует рисунки и ссылки.

Без модуля пришлось бы вручную:

- найти все ``;
- пронумеровать по порядку;
- найти все ссылки на рисунки (в том числе между статьями);
- пересчитать текст ссылки.

Для 100+ рисунков — часы. Модуль делает за секунды.

## Применение

**Когда использовать:** после добавления/удаления/перемещения рисунков — пересчитать номера в `` и обновить текст ссылок `[Рисунок N](…#fig-…)` по всему проекту.

**Когда НЕ использовать:** рисунков нет; нужен только каталог — `figures`.

**Альтернативы:**
- Ручная перенумерация — при 100+ рисунках ошибки неизбежны.
- Только `figures` без `reindexFigures` — каталог с устаревшими номерами.

**Типичный сценарий:** `docs-build.js` → `pre` → `reindexFigures` (первым шагом) → `createFigureContent` собирает каталог с актуальными номерами.

## Как это работает

```mermaid
flowchart TB
    subgraph entry[VS Code / CLI]
        CMD[&quot;UX: reindexFigures&quot;]
        CLI[&quot;CLI: reindexFigures(docs-build pre)&quot;]
    end
    subgraph config[Конфиг]
        RD[&quot;readFigureCaptionTemplate(prefix)&quot;]
        RRD[&quot;readFigureReferenceCaptionTemplate(reference prefix)&quot;]
    end
    subgraph walk[Обход]
        TOC[&quot;TocYamlFileLoadcollectMdFilesInOrder&quot;]
        FILES[&quot;allMdFiles (ordered)&quot;]
    end
    subgraph pass1[Pass 1: caption]
        CAP[&quot;processFigureCaptions(per file)&quot;]
        MAP[&quot;globalFigureMapping(id → N)&quot;]
    end
    subgraph pass2[Pass 2: links]
        LNK[&quot;updateFigureLinksInFile(per file)&quot;]
    end
    subgraph fs[Исходники]
        MD[&quot;docs/**/*.md(обновлены)&quot;]
    end
    CMD --&gt; config
    CLI --&gt; config
    config --&gt; TOC
    TOC --&gt; FILES
    FILES --&gt; CAP
    CAP --&gt; MAP
    CAP --&gt; MD
    MAP --&gt; LNK
    LNK --&gt; MD
```

### Фаза 1. Чтение конфига (префиксы)

```js
function readFigureCaptionTemplate(configJsonOrObj, targetLocale) {
    let config = DiplodocConfigFromJson(configJsonOrObj);
    const activeLocale = targetLocale || config.defaultLanguage || 'ru';
    return GetPrefixOrDefault(config, activeLocale, targetLocale);
}

function GetPrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureCaptionPrefix || 'Figure';
}
```

- **`figureCaptionPrefix`** — из настроек `diplodoc-helper.figureCaptionPrefix` (по умолчанию `«Рисунок»`). Для `en` (если `targetLocale === 'en'`) — `«Figure»`.
- **`figureReferenceCaptionPrefix`** — шаблон для ссылок. По умолчанию `(рис. {0})` для `ru`, `(fig. {0})` для `en`.

`targetLocale` — из CLI/VS Code (обычно `'ru'` или `'en'`). Если `activeLocale` (из конфига) **≠** `targetLocale` — жёстко `«Figure»` (для смешанных конфигов).

### Фаза 2. Обход `toc.yaml`

```js
const tocPath = path.join(rootDir, 'toc.yaml');
if (!fs.existsSync(tocPath)) {
    console.warn('⚠️ toc.yaml не найден');
    return { success: false, reason: 'no_toc', total: 0 };
}

let tocDoc;
try {
    tocDoc = TocYamlFileLoad(tocPath);
} catch {
    return { success: false, reason: 'parse_error', total: 0 };
}

const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];
const allMdFiles = collectMdFilesInOrder(entries, rootDir);

if (allMdFiles.length === 0) {
    return { success: true, total: 0, reason: 'no md-file found' };
}
```

- **`rootDir`** — корень языка (`docs/ru/`).
- **`collectMdFilesInOrder`** — из `utils/toc.order`, рекурсивно обходит `items`, `include`, `items[]`. Возвращает `.md` в порядке появления в `toc.yaml`.
- **Если `toc.yaml` нет** — `{ success: false, reason: 'no_toc' }`. Пользователь увидит `showWarningMessage` (см. `ux_reindex_figures`).

### Фаза 3. Pass 1 — нумерация подписей

```js
let globalFigureMapping = new Map();
let figureCounter = 1;

for (const mdFilePath of allMdFiles) {
    try {
        const content = fs.readFileSync(mdFilePath, 'utf8');
        const { newContent, newCounter, figureMapping } = processFigureCaptions(
            content,
            figureCounter,
            figureCaptionTemplate,
            mdFilePath
        );

        for (const [uniqueKey, num] of figureMapping) {
            globalFigureMapping.set(uniqueKey, num);
        }

        if (newContent !== content) {
            fs.writeFileSync(mdFilePath, newContent, 'utf8');
            console.log(`${path.relative(rootDir, mdFilePath)} — +${newCounter - figureCounter} рис.`);
        }
        figureCounter = newCounter;
    } catch (err) {
        console.error(`❌ Ошибка обработки ${mdFilePath}:`, err);
    }
}
```

**`processFigureCaptions(content, startCounter, prefix, mdFilePath)`**:

```js
const regex = /([\s\S]*?)/gi;
let counter = startCounter;
const mapping = new Map();

const newContent = content.replace(regex, (match, beforeId, id, afterId, captionText) =&gt; {
    let cleaned = captionText
        .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
        .replace(/^\d+\.\s*/, '')
        .trim();

    const newCaption = `${prefix} ${counter}. ${cleaned}`;
    const replacement = `${newCaption}</a></td>
  <td class="fig-preview"><span class="fig-preview-empty">—</span></td>
</tr>
<tr>
  <td class="fig-num">9</td>
  <td class="fig-title"><a href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D1%80%D0%B8%D1%81%D1%83%D0%BD%D0%BA%D0%BE%D0%B2/index.html#…">…</a></td>
  <td class="fig-preview"><span class="fig-preview-empty">—</span></td>
</tr>
</tbody>
</table>
<div class="figures-grid">
<div class="fig-grid-card">
  <div class="fig-grid-preview"><span class="fig-grid-placeholder">—</span></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">1</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/index.html#fig-…">`.

Без модуля пришлось бы:

1. Сохранить скриншот в файл (через системный редактор).
2. Найти нужную папку `images/`, перенести файл, придумать имя.
3. Открыть `.md`, написать `![alt](images/foo.png)`.
4. Обернуть в `` + `` — иначе `reindexer.figures` не пронумерует, `figures` не соберёт в каталог, тултипы не появятся.

Модуль делает это за одно действие. Ограничение — работает только при наличии графической сессии (без `DISPLAY`/`SESSIONNAME` — `getImageFromClipboard` вернёт `null`).

## Применение

**Когда использовать:** в буфере — свежий скриншот, и нужно вставить его в `.md` как `` с превью и `` для `figures`/`reindexer.figures`.

**Когда НЕ использовать:** буфер содержит текст; Linux без `xclip`; нужна ссылка на уже существующую картинку — `image.PasteFromList`.

**Альтернативы:**
- Сохранить скриншот в файл, потом `![](…)` + `` вручную — долго.
- `image.PasteFromList` — не работает с буфером, только с существующими.

**Типичный сценарий:** сделать скриншот → в `.md` **Diplodoc → Вставить рисунок из буфера обмена** → ввести имя → картинка в `images/` + ``-блок.

## Как это работает

```mermaid
flowchart TB
    subgraph entry[VS Code]
        CMD[&quot;UX: pasteImageFromClipboard&quot;]
        ED[&quot;activeTextEditor&quot;]
        CHK1[&quot;languageId === 'markdown'&quot;]
    end
    subgraph clip[Буфер обмена]
        OS[&quot;os.platform()&quot;]
        WIN[&quot;powershellGetImage&quot;]
        MAC[&quot;osascriptclipboard as PNGf&quot;]
        LIN[&quot;xclip-t image/png&quot;]
    end
    subgraph prompt[Диалог]
        INPUT[&quot;showInputBox(имя файла)&quot;]
        SAN[&quot;slugify_latin_alphanumeric&quot;]
    end
    subgraph fs[Файлы]
        MKDIR[&quot;mkdir images/&quot;]
        WRITE[&quot;writeFileSync&quot;]
        IMGPATH[&quot;images/&amp;lt;slug&amp;gt;.png&quot;]
    end
    subgraph build[Сборка]
        FIG[&quot;buildFigure(figure + figcaption)&quot;]
        CTX[&quot;getCursorContext(listIndent)&quot;]
    end
    subgraph insert[Вставка]
        INS[&quot;insertIndentedBlock&quot;]
        FINAL[&quot;&amp;lt;figure&amp;gt;…&amp;lt;/figure&amp;gt;&quot;]
    end
    CMD --&gt; ED
    ED --&gt; CHK1
    CHK1 --&gt; OS
    OS --&gt; WIN
    OS --&gt; MAC
    OS --&gt; LIN
    WIN --&gt; INPUT
    MAC --&gt; INPUT
    LIN --&gt; INPUT
    INPUT --&gt; SAN
    SAN --&gt; MKDIR
    MKDIR --&gt; WRITE
    WRITE --&gt; IMGPATH
    IMGPATH --&gt; FIG
    FIG --&gt; CTX
    CTX --&gt; INS
    INS --&gt; FINAL
```

### Фаза 1. Проверка контекста

```js
const editor = vscode.window.activeTextEditor;
if (!editor) {
    vscode.window.showErrorMessage(translate(nls_ts.paste.image.error.noactiveeditor));
    return;
}

const document = editor.document;
if (document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.mdfileonly));
    return;
}
```

Две проверки:

1. **Редактор** — если `undefined`, ошибка `«Нет активного редактора»`. В норме недостижимо: команда видна только при `editorTextFocus`.
2. **Язык** — `markdown`. На других языках — предупреждение `«Команда может использоваться только в .md файлах»`.

### Фаза 2. Чтение буфера (`getImageFromClipboard`)

```js
const clipboardImage = await getImageFromClipboard();
if (!clipboardImage) {
    vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.emptybuffer));
    return;
}
```

`getImageFromClipboard` (из `utils/clipboard.image.js`) — `Promise`:

1. **`os.platform()`** — определяет ОС.
2. **Temp-файл** — `path.join(os.tmpdir(), \`vscode_clip_${Date.now()}.png\`)`.
3. **OS-команда** (через `cp.execFile`):
   - **Windows**: `powershell -NoProfile -NonInteractive -Command &quot;Add-Type … GetImage(); $image.Save(tempPath, PNG); exit 0&quot;`;
   - **macOS**: `osascript -e 'write (the clipboard as «class PNGf») to (open for access POSIX file &quot;tempPath&quot; with write permission)'`;
   - **Linux**: `xclip -selection clipboard -t image/png -o &gt; tempPath`.
4. **Ожидание** — `execFile` запускает команду, ждёт `callback`.
5. **Чтение** — если `error` → удалить temp, `resolve(null)`; иначе `fs.readFileSync(tempPath)`, `fs.unlinkSync(tempPath)`, `resolve(buffer)`.

Внешние зависимости — `xclip` (Linux), `osascript` (macOS), `powershell` (Windows). На любой ошибке (нет `xclip`, буфер пуст, нет `DISPLAY`, таймаут) — `resolve(null)`.

### Фаза 3. Диалог имени файла

```js
const mdDir = path.dirname(document.uri.fsPath);
const imagesDir = path.join(mdDir, 'images');

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);

const userInput = await vscode.window.showInputBox({
    prompt: translate(nls_ts.screenshot.name.prompt),
    placeHolder: translate(nls_ts.screenshot.description.placeholder),
    value: defaultFilename,
    validateInput: value =&gt; { … },
});

if (!userInput) return;
```

1. **`mdDir`** — папка текущего `.md`.
2. **`imagesDir`** — `/images/`. Создаётся, если нет (`fs.mkdirSync(recursive: true)`).
3. **`timestamp`** — `new Date().toISOString()` (`2024-01-15T12:30:45.123Z`) → замена `:`/`.` на `-` → замена `T` на `_` → `slice(0, 19)` → `2024-01-15_12-30-45`.
4. **`defaultFilename`** — `translate(screenshot.name.prompt, timestamp)` — подставляет `{0}` → `2024-01-15_12-30-45_Скриншот` (ru) или `2024-01-15_12-30-45_Screenshot` (en).
5. **`InputBox`**:
   - `prompt: translate(screenshot.name.prompt)` — **без** подстановки → `&quot;{0}_Скриншот&quot;` (литерально);
   - `placeHolder: translate(screenshot.description.placeholder)` — `«Описание_скриншота»`;
   - `value: defaultFilename` — предзаполненное;
   - `validateInput` — три правила (см. ниже).

`validateInput`:

```js
validateInput: value =&gt; {
    if (!value || value.trim().length === 0) {
        return 'Имя не может быть пустым';
    }
    const cleanName = slugify_latin_alphanumeric(value);
    if (cleanName.length === 0) {
        return translate(nls_ts.screenshot.name.error.wrongcharacters);
    }
    const testPath = path.join(imagesDir, `${cleanName}${imageExtension}`);
    if (fs.existsSync(testPath)) {
        return translate(nls_ts.filename.error.alreadyexists);
    }
    return null;
},
```

- пустое → `«Имя не может быть пустым»` (захардкожено, не NLS);
- `slugify_latin_alphanumeric(value) === ''` → `«Имя содержит недопустимые символы»`;
- файл `images/.png` уже существует → `«Файл с таким именем уже существует»`.

`imageExtension = '.png'` — константа в начале файла.

### Фаза 4. Запись файла

```js
const cleanName = slugify_latin_alphanumeric(userInput);
const fileName = `${cleanName}.png`;
const imagePath = path.join(imagesDir, fileName);

try {
    if (fs.existsSync(imagePath)) {
        throw new Error(translate(nls_ts.screenshot.error.alreadyexists.async));
    }

    fs.writeFileSync(imagePath, clipboardImage);

    let relativePath = path.relative(mdDir, imagePath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }
    // …
```

1. **`cleanName`** — slugify от `userInput` (`Привет Мир!` → `privet_mir`).
2. **`fileName`** — `${cleanName}.png` (жёстко `.png`, а не `imageExtension`).
3. **`imagePath`** — `images/.png`.
4. **Проверка на существование** — если файл уже есть (race condition после `validateInput`), `throw` `«Файл был создан параллельно и уже существует»`.
5. **`fs.writeFileSync`** — запись буфера.
6. **`relativePath`** — `path.relative(mdDir, imagePath)` (`images/foo.png` или `../foo/images/foo.png`), нормализация `\` → `/`, добавление `./`-префикса.

### Фаза 5. Сборка ``

```js
const altText = userInput.trim();
const customId = buildFigureId(cleanName);
const figureBlock = buildFigure(relativePath, altText, customId);
```

- **`altText`** — `userInput.trim()`, **не** `cleanName`. То есть alt в markdown-ссылке — с кириллицей и пробелами (`Привет Мир!`), а `id` — на латинице (`fig-privet_mir`). См. «Известные ограничения».
- **`customId`** — `fig-` (не ``, а `fig-`).
- **`figureBlock`** — `\n\n![alt](url)\n\nalt</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/images/skrinshot_nastrojki.png" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/images/skrinshot_nastrojki.png" alt="Скриншот настройки" class="js-lightbox-trigger fig-grid-img" loading="lazy" /></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">2</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%92%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%D0%B8%D0%B7%D0%B1%D1%83%D1%84%D0%B5%D1%80%D0%B0/index.html#fig-skrinshot_nastrojki">Скриншот настройки</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><img data-src="/ru/relative" data-full-src="/ru/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}

```js
const wrappedText = `${selectedText}`;
```

`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-grid-img" loading="lazy" /></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">3</span>
    <a class="fig-grid-title" href="/ru/known-issues-summary.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}

```js
const wrappedText = `${selectedText}`;
```

`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-grid-img" loading="lazy" /></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">4</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-module.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-grid-img" loading="lazy" /></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">5</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-severity.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><img data-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" data-full-src="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/relative" alt="` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…" class="js-lightbox-trigger fig-grid-img" loading="lazy" /></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">6</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%98%D0%B7%D0%B2%D0%B5%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D0%BF%D1%80%D0%BE%D0%B1%D0%BB%D0%B5%D0%BC%D1%8B/known-issues-by-type.html#fig-…">` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut &quot;Развернуть&quot; %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut &quot;Развернуть&quot; %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `` тоже: если выделение на второй строке внутри `\n…\n`, `isInsideHtmlTag` ищет `` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut &quot;Развернуть&quot; %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut &quot;Развернуть&quot; %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `…` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut &quot;Развернуть&quot; %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut &quot;Развернуть&quot; %}


const wrappedText = `${selectedText}`;


`selectedText` вставляется как есть. Если пользователь выделил `alert(1)`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, ``) и применил `addAnchor` — получит `…</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><span class="fig-grid-placeholder">—</span></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">7</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%98%D0%BB%D0%BB%D1%8E%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D0%B8/index.html#…">`), генерирует уменьшенные превью каждого изображения через `sharp` и строит страницу-каталог с таблицей иллюстраций: номер, название, мини-превью, ссылка на полноразмерный оригинал.

Практический смысл: техписатель или читатель видит все иллюстрации в одной таблице с быстрым переходом к исходной статье и полноразмерному изображению. Номера иллюстраций идут в порядке появления в документе — совпадают с нумерацией, которую проставляет `reindexFigures` (отдельный модуль `reindexer/reindexer.figures.js`).

Модуль работает исключительно в `pre-processing` — генерирует `docs/**/figures/index.md` с встроенной HTML-разметкой. Клиентской части нет: переключатель list/grid и лайтбокс подразумеваются разметкой, но требуют внешних скриптов темы (см. «Известные ограничения»).

## Применение

**Когда использовать:** в документации десятки+ иллюстраций, и нужен каталог «все рисунки в одном месте» с превью, номерами и ссылками на исходные статьи.

**Когда НЕ использовать:** 2–3 картинки — хватит обычного списка; нужен только список для вставки — используйте `image.PasteFromList` (не генерирует каталог).

**Альтернативы:**
- Ручной `figures/index.md` — рассинхронизируется.
- Только `reindexer.figures` — нумерует, но не собирает каталог.

**Типичный сценарий:** `docs-build.js` → `pre` → `reindexFigures` (нумерация) → `createFigureContent` (`figures` собирает каталог с превью через `sharp`).

## Как это работает

```mermaid
flowchart TB
    subgraph md[Исходники]
        MD[&quot;docs/**/*.md&quot;]
        IMG[&quot;docs/**/images/*.png&quot;]
    end
    subgraph pre[Pre-processing]
        EXT[&quot;extractorextractFiguresFromFile&quot;]
        COL[&quot;collectorwalkMdFilesGetFigures&quot;]
        THUMB[&quot;sharpcreateThumbnail&quot;]
        WRI[&quot;writerwriteFigureList&quot;]
    end
    subgraph out[Выход]
        IDX[&quot;figures/index.mdtoc.yamlindex.yaml&quot;]
        THUMBS[&quot;figures/thumbs/*.webp&quot;]
    end
    MD --&gt; EXT
    EXT --&gt; COL
    COL --&gt; THUMB
    COL --&gt; WRI
    IMG -.-&gt; THUMB
    THUMB --&gt; THUMBS
    WRI --&gt; IDX
```

1. **Извлечение.** `extractFiguresFromFile` читает `.md`, находит все ``, ищет ближайшее markdown-изображение **слева** от каждого ``. Возвращает `{ id, caption, imagePath, imageAlt, sourcePath, figureNumber }`, где `figureNumber` вытаскивается из `Рисунок N` / `Figure N` / `Fig. N` в тексте подписи.

2. **Сбор.** `walkMdFilesGetFigures` обходит `langDir`, пропускает `SKIP_DIRS` (`figures`, `contexts`, `helptags`). Собирает плоский массив записей по всем статьям.

3. **Превью.** `processThumbnails` для каждой записи с `imagePath` (не `http:`, не `data:`, не `//`):
   - резолвит абсолютный путь от директории `.md` + `imagePath`;
   - проверяет существование через `toExtendedPath` (обход MAX_PATH на Windows);
   - считает `md5`-хеш относительного пути (первые 12 символов) для имени превью;
   - через `sharp` ресайзит до ширины 360px с `fit: 'inside'` (без увеличения) и сохраняет `figures/thumbs/_.webp` (quality 80);
   - пропускает, если превью уже существует;
   - записывает в `fig.thumbPath` абсолютный URL вида `/ru/figures/thumbs/_.webp`.

4. **Запись.** `writeFigureList` сортирует по `figureNumber` (или алфавитно по `caption`, если номера нет), генерирует `index.md`:
   - frontmatter `title: Перечень иллюстраций` (`List of figures` для `en`);
   - переключатель `` (кнопки `Список` / `Сетка`);
   - `` — по умолчанию видима (`data-view=&quot;list&quot;`);
   - `` — второй вид того же набора;
   - каждая запись — `` с номером, названием (ссылка на `article.html#fig-…`) и ``;
   - `toc.yaml` / `index.yaml` — заголовок и `href`.

### Файлы модуля

| Файл                   | Ответственность                                 |
| ---------------------- | ----------------------------------------------- |
| `figures.js`           | `runGeneration(docsRoot)` — оркестратор (async) |
| `figures.collector.js` | `walkMdFilesGetFigures` — обход `docs/`         |
| `figures.extractor.js` | `extractFiguresFromFile`, `extractFigureNumber` |
| `figures.writer.js`    | `writeFigureList` — генерация `index.md`        |
| `figures.model.js`     | пустой (`module.exports = {}`)                  |

### Ожидаемая разметка в `.md`

```html


![Описание](./images/foo.png)

Рисунок 1. Описание</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><span class="fig-grid-placeholder">—</span></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">8</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D1%80%D0%B8%D1%81%D1%83%D0%BD%D0%BA%D0%BE%D0%B2/index.html#…">`:
   - очищает текущую подпись от `Рисунок N.` / `Figure N.` / `Рис. N.`;
   - ставит **сквозной** номер ` N. `;
   - запоминает `id → N` в глобальный `mapping`.
3. **Повторно идёт по файлам** — обновляет все ссылки `[текст](path#fig-)`:
   - находит новый номер в `mapping` по `` + ``;
   - пересчитывает `(рис. N)` / `(fig. N)` по шаблону из настроек.

Ключевое отличие от [`figures`](../МодульИллюстрации/index.md): `figures` **собирает** иллюстрации в каталог `figures/index.md`, а `reindexer.figures` **меняет** `.md`-файлы — нумерует рисунки и ссылки.

Без модуля пришлось бы вручную:

- найти все ``;
- пронумеровать по порядку;
- найти все ссылки на рисунки (в том числе между статьями);
- пересчитать текст ссылки.

Для 100+ рисунков — часы. Модуль делает за секунды.

## Применение

**Когда использовать:** после добавления/удаления/перемещения рисунков — пересчитать номера в `` и обновить текст ссылок `[Рисунок N](…#fig-…)` по всему проекту.

**Когда НЕ использовать:** рисунков нет; нужен только каталог — `figures`.

**Альтернативы:**
- Ручная перенумерация — при 100+ рисунках ошибки неизбежны.
- Только `figures` без `reindexFigures` — каталог с устаревшими номерами.

**Типичный сценарий:** `docs-build.js` → `pre` → `reindexFigures` (первым шагом) → `createFigureContent` собирает каталог с актуальными номерами.

## Как это работает

```mermaid
flowchart TB
    subgraph entry[VS Code / CLI]
        CMD[&quot;UX: reindexFigures&quot;]
        CLI[&quot;CLI: reindexFigures(docs-build pre)&quot;]
    end
    subgraph config[Конфиг]
        RD[&quot;readFigureCaptionTemplate(prefix)&quot;]
        RRD[&quot;readFigureReferenceCaptionTemplate(reference prefix)&quot;]
    end
    subgraph walk[Обход]
        TOC[&quot;TocYamlFileLoadcollectMdFilesInOrder&quot;]
        FILES[&quot;allMdFiles (ordered)&quot;]
    end
    subgraph pass1[Pass 1: caption]
        CAP[&quot;processFigureCaptions(per file)&quot;]
        MAP[&quot;globalFigureMapping(id → N)&quot;]
    end
    subgraph pass2[Pass 2: links]
        LNK[&quot;updateFigureLinksInFile(per file)&quot;]
    end
    subgraph fs[Исходники]
        MD[&quot;docs/**/*.md(обновлены)&quot;]
    end
    CMD --&gt; config
    CLI --&gt; config
    config --&gt; TOC
    TOC --&gt; FILES
    FILES --&gt; CAP
    CAP --&gt; MAP
    CAP --&gt; MD
    MAP --&gt; LNK
    LNK --&gt; MD
```

### Фаза 1. Чтение конфига (префиксы)

```js
function readFigureCaptionTemplate(configJsonOrObj, targetLocale) {
    let config = DiplodocConfigFromJson(configJsonOrObj);
    const activeLocale = targetLocale || config.defaultLanguage || 'ru';
    return GetPrefixOrDefault(config, activeLocale, targetLocale);
}

function GetPrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureCaptionPrefix || 'Figure';
}
```

- **`figureCaptionPrefix`** — из настроек `diplodoc-helper.figureCaptionPrefix` (по умолчанию `«Рисунок»`). Для `en` (если `targetLocale === 'en'`) — `«Figure»`.
- **`figureReferenceCaptionPrefix`** — шаблон для ссылок. По умолчанию `(рис. {0})` для `ru`, `(fig. {0})` для `en`.

`targetLocale` — из CLI/VS Code (обычно `'ru'` или `'en'`). Если `activeLocale` (из конфига) **≠** `targetLocale` — жёстко `«Figure»` (для смешанных конфигов).

### Фаза 2. Обход `toc.yaml`

```js
const tocPath = path.join(rootDir, 'toc.yaml');
if (!fs.existsSync(tocPath)) {
    console.warn('⚠️ toc.yaml не найден');
    return { success: false, reason: 'no_toc', total: 0 };
}

let tocDoc;
try {
    tocDoc = TocYamlFileLoad(tocPath);
} catch {
    return { success: false, reason: 'parse_error', total: 0 };
}

const entries = Array.isArray(tocDoc) ? tocDoc : tocDoc?.items || [];
const allMdFiles = collectMdFilesInOrder(entries, rootDir);

if (allMdFiles.length === 0) {
    return { success: true, total: 0, reason: 'no md-file found' };
}
```

- **`rootDir`** — корень языка (`docs/ru/`).
- **`collectMdFilesInOrder`** — из `utils/toc.order`, рекурсивно обходит `items`, `include`, `items[]`. Возвращает `.md` в порядке появления в `toc.yaml`.
- **Если `toc.yaml` нет** — `{ success: false, reason: 'no_toc' }`. Пользователь увидит `showWarningMessage` (см. `ux_reindex_figures`).

### Фаза 3. Pass 1 — нумерация подписей

```js
let globalFigureMapping = new Map();
let figureCounter = 1;

for (const mdFilePath of allMdFiles) {
    try {
        const content = fs.readFileSync(mdFilePath, 'utf8');
        const { newContent, newCounter, figureMapping } = processFigureCaptions(
            content,
            figureCounter,
            figureCaptionTemplate,
            mdFilePath
        );

        for (const [uniqueKey, num] of figureMapping) {
            globalFigureMapping.set(uniqueKey, num);
        }

        if (newContent !== content) {
            fs.writeFileSync(mdFilePath, newContent, 'utf8');
            console.log(`${path.relative(rootDir, mdFilePath)} — +${newCounter - figureCounter} рис.`);
        }
        figureCounter = newCounter;
    } catch (err) {
        console.error(`❌ Ошибка обработки ${mdFilePath}:`, err);
    }
}
```

**`processFigureCaptions(content, startCounter, prefix, mdFilePath)`**:

```js
const regex = /([\s\S]*?)/gi;
let counter = startCounter;
const mapping = new Map();

const newContent = content.replace(regex, (match, beforeId, id, afterId, captionText) =&gt; {
    let cleaned = captionText
        .replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '')
        .replace(/^\d+\.\s*/, '')
        .trim();

    const newCaption = `${prefix} ${counter}. ${cleaned}`;
    const replacement = `${newCaption}</a>
  </div>
</div>
<div class="fig-grid-card">
  <div class="fig-grid-preview"><span class="fig-grid-placeholder">—</span></div>
  <div class="fig-grid-meta">
    <span class="fig-grid-num">9</span>
    <a class="fig-grid-title" href="/ru/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D0%B8/%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B5%D1%80%D0%B5%D0%B8%D0%BD%D0%B4%D0%B5%D0%BA%D1%81%D0%B0%D1%86%D0%B8%D1%8F%D1%80%D0%B8%D1%81%D1%83%D0%BD%D0%BA%D0%BE%D0%B2/index.html#…">…</a>
  </div>
</div>
</div>
</div>
