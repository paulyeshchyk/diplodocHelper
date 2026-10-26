---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `injectContainerIntoState` не вызывается

В `Pagebuilder.Config.FootnoteList.js` есть функция `injectContainerIntoState(html)`:

```js
json.data.html += '\n<div id="footnotes-container"></div>';
return html.replace(stateRe, `$1${JSON.stringify(json)}$3`);
```

Она должна добавлять `<div id="footnotes-container">` в `diplodoc-state`, чтобы контейнер существовал ещё до hydrate. **Но её никто не вызывает** — ни `injectFootnoteList`, ни CLI, ни `docs-build.js`. Функция экспортируется? Нет — только `injectFootnoteList` в `module.exports`. Так что `injectContainerIntoState` — мёртвый код.

Практический эффект: контейнер создаётся клиентом (`ensureContainer`), и работает это за счёт `MutationObserver`. Если бы `injectContainerIntoState` вызывался, `tick()` сработал бы сразу, без 15-секундного polling'а. Как есть — при неудаче `@diplodoc/cli` отрендерить `.dc-doc-page__body` (например, в шаблоне изменился класс), страница с перечнем будет пустой.

### `generateFootnoteListPage` не существует

В `generateNavigationContent.js`:

```js
} else if (command === 'footnoteList') {
    generateFootnoteListPage({ docsDir, outputDir, lang: 'ru', langPrefix: 'ru' });
}
```

Но в `Pagebuilder.Config.FootnoteList.js` **нет** функции `generateFootnoteListPage` — там только `injectFootnoteList`. Импорт в `generateNavigationContent.js`:

```js
const { generateFootnoteListPage } = require('./Pagebuilder.Config.FootnoteList');
// → undefined
```

Если кто-то вызовет `generateNavigationContent({ command: 'footnoteList', … })`, получит `TypeError: generateFootnoteListPage is not a function`.

К счастью, **это не путь CLI**: `diplodoc-helper-cli.js` для `footnoteList` вызывает `injectFootnoteList` напрямую:

```js
} else if (command === 'footnoteList') {
    // …resolves targetHtml…
    const { injectFootnoteList } = require('./contentNavigator/Pagebuilder.Config.FootnoteList.js');
    const r = injectFootnoteList({ docsDir, targetHtml, langPrefix });
}
```

`generateNavigationContent.js` — отдельная точка входа (`runGeneration({ command })`), которая, судя по всему, не используется в текущей сборке. Но код, который в ней есть для `footnoteList`, нерабочий.

### `footnoteList` не «оживляет» уже отрисованную таблицу — нет обновления при `MutationObserver`

Клиент `footnoteList.js`:

```js
function tick() {
    var c = ensureContainer();
    if (!c) return false;
    if (!c.querySelector('.footnote-table')) renderTable();
    return true;
}
```

`MutationObserver` подписан на `document.body` и при **любом** изменении проверяет `if (!document.getElementById('footnotes-container')) tick()`. То есть если контейнер **есть** (например, Diplodoc сам его отрисовал), но таблица ещё не построена — `tick()` не сработает, потому что контейнер уже есть. `renderTable()` вызывается только в `tick()`. То есть `MutationObserver` не запускает рендер при изменениях.

Практически: контейнер обычно создаётся `ensureContainer` в первом `tick()` — то есть до `MutationObserver`. Повторный рендер не нужен. Но если Diplodoc перезапишет контейнер (например, при навигации по `#`-якорю внутри страницы), таблица пропадёт, и `MutationObserver` её не восстановит.

### `--section` ищет **только** папку с точным именем

`findSectionIndexHtml(outputDir, sectionName)`:

```js
if (e.name.toLowerCase() === sectionName.toLowerCase()) {
    const indexHtml = path.join(full, 'index.html');
    if (fs.existsSync(indexHtml)) return indexHtml;
}
```

Поиск по точному имени папки, без учёта регистра. Если у пользователя папка называется `Переченьсносок`, а `--section` передан как `ПереченьСносок` — сработает. Если `Перечень сносок` (с пробелом) или `Перечень_сносок` — не найдёт. Молча: `process.exitCode = 1` с сообщением `[footnoteList] Секция "…" не найдена`.

### `urlPrefix` не кодируется

```js
let urlPrefix = path.relative(targetDir, buildRoot).replace(/\\/g, '/');
if (urlPrefix && !urlPrefix.endsWith('/')) urlPrefix += '/';
```

`path.relative` даёт `../../..`. Но если в пути к целевой странице есть кириллица (`Дополнительнаяинформация/Переченьсносок`), то при обратном построении URL в `collectFootnotes`:

```js
const url = `${urlPrefix}${prefixWithLang}${rel}`;
```

`rel` = `path.relative(docsDir, file).replace('.md', '.html')` — тоже может содержать кириллицу. Итоговый `url` попадает в `footnoteList.data.js` **без** `encodeURI`. Браузер при рендере `<a href="…кириллица…">` сделает percent-encoding сам, но в `JSON` это выглядит «как есть», и `refUrl` с `#fnrefN` тоже.

Работает, потому что браузер нормализует. Но если кто-то читает `footnoteList.data.js` программно (или копирует `href` в curl), нужно помнить: URL не закодирован.

### `stripLinks` удаляет **все** ссылки

И серверный, и клиентский `stripLinks` вырезают `<a>`, `![…](…)` и `[…](…)`. То есть если в определении сноски была ссылка на статью, в таблице останется только текст без ссылки. Пример:

```md
[^44]: См. [раздел «Установка»](../Установка/index.md).
```

В `footnoteList.data.js` текст будет `См. раздел «Установка».` — без ссылки.

Возможно, это намеренно (в таблице сносок не нужна вложенная навигация), но не описано ни в одном комментарии к коду. Если захочешь сохранять ссылки — придётся расширить `stripLinks` (оставлять `[text](url)` → `<a href>`), но это потребует клиентского рендера с санитайзером (как в `gosts`).

### `langPrefix` из CLI — эвристика

```js
const lastSeg = path.basename(path.resolve(docsDir));
const langPrefix = /^[a-z]{2}$/i.test(lastSeg) ? lastSeg : null;
```

Если пользователь передал `--docsDir ./docs/ru/` — `basename` даст `ru`, `langPrefix = 'ru'`. Если `--docsDir ./docs/` (корень, не язык) — `langPrefix = null`, и `url` в данных будет без языкового сегмента (`../../../Модули/…`), а не `../../../ru/Модули/…`. Это может «сработать» (если сайт собирается без языковых подпапок), но по умолчанию в Diplodoc языковые подпапки есть — так что `--docsDir` должен указывать на корень языка.

### Порядок сносок определяется `toc.yaml`, но не «физическим» порядком в файле

`collectFootnotes` идёт по `collectMdFilesByToc(docsDir)`, а не по физическому порядку. Если сноски в статье идут `[^43]` перед `[^44]` (пользователь вручную переставил), глобальные номера присвоятся по порядку появления ссылок в тексте (первая встреча — номер 1), а не по исходному `id`. Это согласуется с `footnotes` (pre), где нумерация тоже по порядку появления ссылок, но **не** согласуется с ручным `id` в `.md`. То есть `[^43]` в исходнике может стать `#1` в таблице — это норма для сквозной нумерации.

### `footnoteList` не экспортируется из `diplodoc-helper-cli.js`

В `module.exports` файла `diplodoc-helper-cli.js`:

```js
module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    // ...
    // generateFootnoteList отсутствует
};
```

Как и `helptags`, модуль доступен только через CLI-команду, но не через программный `require('diplodoc-helper-cli').generateFootnoteList`. Для внешних интеграций (кто-то хочет встроить вызов) это неудобно.