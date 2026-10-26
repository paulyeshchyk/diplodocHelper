---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Контексты с пробелом ломают ссылку

`a.href = '/' + currentLang + '/contexts/' + encodeURIComponent(item.label) + '.html'` — где `label` — исходный контекст (lowercase, `.trim()`). Файл `contexts/<slugify_filename(term)>.html` создаётся из `term` через `slugify_filename` (пробел → `_`).

Расхождение для контекстов с пробелом:
- `label = "product catalog"` → `href = contexts/product%20catalog.html`;
- файл = `contexts/product_catalog.html`.

404.

Правильно — использовать `item.slug` (в `__CONTEXT_ITEMS__` есть, но не используется) и генерировать его тем же `slugify_filename`, что и `contexts.writer`.

### `slug` не совпадает с именем файла

Даже если использовать `item.slug`:

```js
const slug = context.replace(/\s+/g, '');
```

`slug` = `"productcatalog"` (пробелы удалены). Файл = `"product_catalog"` (пробел → `_`). Всё равно не совпадает.

Правильно — в `context-tags.js` при формировании `contextItems` использовать `slugify_filename` из `contexts.writer`/`utils/encoding.slugify`. Или в `context-tags.client` вызывать `slugify_filename` — но клиент не знает про этот модуль (не импортирует).

### Inline-стили в `<script>` — дублирование

При каждом вызове (если `#context-tags-container` нет) — новый `<style>` в `<head>`. Если когда-нибудь появится SPA — 10 копий. Сейчас неактуально.

### Retry без ограничения

```js
if (!container) {
    setTimeout(insertContextTags, 300);
    return;
}
```

Бесконечный retry. Если `.dc-doc-page__main` не появится (шаблон сломан) — каждые 300 мс вызов, вечно.

### `MutationObserver` отсутствует

В отличие от `abbrs.client`, `terms.client`, `footnotes.client`, здесь нет `MutationObserver`. Если `.dc-doc-page__main` появляется позже 300 мс — retry через 300 мс справится. Но если появляется через 100 мс — первая попытка не сработает, ждёт 300 мс. Небольшая задержка на страницах с быстрым рендером.

### `visibleCount = 5` — захардкожено

Не через `context-tags.config`. Не через `window.__CONTEXT_ITEMS__`. Если нужно 10 — правка кода.

### `context-tags.js` не настраивается через CLI

`runGeneration(buildDir)` — вызывается из `docs-build.js` (фаза `post`, `cli('contexttags', './build')`). Других параметров нет. Язык — из URL (`/ru/` / `/en/`). Контексты — из `<meta name="context">`.

### `a.target` — не задан

Все ссылки на `contexts/<slug>.html` — в текущей вкладке. Для внутренней навигации — норма. Но если пользователь хочет параллельно смотреть статью и контекст — открывать в новой вкладке вручную.

### `item.label` не экранируется при `encodeURIComponent`

`encodeURIComponent` корректно работает с юникодом. Но если `label` содержит `/` (например, `context: "foo/bar"`) — `encodeURIComponent` превратит в `%2F`, браузер загрузит `contexts/foo%2Fbar.html` (404, потому что `slugify_filename` превратит `/` в `_`).

### `MutationObserver` и `context-tags` — отсутствие синхронизации с `contexts`

Если `contexts` не запущен (пользователь забыл `--skip=contexts`), `contexts/<slug>.html` не существует. Ссылки ведут на 404. Клиент не проверяет существование — просто рисует `<a href>`.

### `document.head` — без проверки

```js
document.head.appendChild(style);
```

Если `document.head` не существует (редкость в HTML5) — `TypeError`. Не поймано. На практике всегда есть.

### Inline-скрипт `__CONTEXT_ITEMS__` — данные для каждой страницы

`context-tags.js` для каждой HTML-страницы генерирует **свой** `<script>` с её контекстами. Для 500 страниц — 500 разных инлайн-скриптов (по 200–500 байт каждый). Дублирование стилей (одинаковых) — 500 копий. Можно было бы вынести стили в общий CSS, а `__CONTEXT_ITEMS__` — в `<script type="application/json">` с id страницы.

Сейчас — работает, но HTML «толстеет» на ~1 KB × N страниц.