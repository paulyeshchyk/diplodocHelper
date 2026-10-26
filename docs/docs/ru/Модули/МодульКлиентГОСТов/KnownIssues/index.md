---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Клик по ссылке внутри ячейки триггерит row-click

`onRowClick` вешается на `<tr class="gost-main-row">`. Если в ячейке есть `<a href>` (через `formatMarkdown` — например, `title: "См. [раздел](../foo.md)"`), клик по ссылке откроет ссылку **и** раскроет/закроет карточку. Мешает UX.

Фикс — `if (e.target.closest('a')) return;` в `onRowClick`.

### `formatMarkdown` экранирует HTML, но не санитизирует `url`

```js
return safe.replace(/\[([^16]]+)\]\(([^17]+)\)/g, (match, linkText, url) => {
    const isExternal = url.startsWith('http');
    const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${url}"${targetAttr}>${linkText}</a>`;
});
```

Если `url` содержит `javascript:alert(1)` (автор словаря ошибся) — это выполнится при клике. Не XSS через данные пользователя (автор словаря доверенный), но `javascript:` не заблокирован явно.

Фикс — проверка `if (/^javascript:/i.test(url)) return match;`.

### `formatMarkdown` — только `[text](url)`

Не поддерживает `![alt](url)`, `<a href>`, `**bold**`, курсив. Только inline-ссылки. Для `description` в ГОСТе это разумно, но не документировано.

### `escape` не обёрнуто в `data-*`

Если в `description` встретится `[text](url)` с `]` или `)` внутри `text`/`url` — сломается парсинг. Регулярка простая, не учитывает вложенность.

### `getSortedGroups` — `sortedTypes = Object.keys(groups).sort()`

Алфавитная сортировка групп. «ГОСТ» vs «Классификатор» — по Unicode, с учётом регистра (`'Г'` < `'К'`, ок). Но если пользователь добавит группу `'прочее'` (lowercase) — она окажется **после** `'ГОСТ'` и `'Классификатор'`, несмотря на алфавит. `.sort()` без localeCompare — чувствителен к регистру.

### `formatMarkdown(item.date || '—')` — `date` может быть `Date`

В YAML `date: 01.05.2002` парсится как строка (не как дата). Но если кто-то напишет `date: 2002-05-01` — `js-yaml` может распарсить как `Date`. `String(date)` → `'Wed May 01 2002 …'` — не то, что ожидалось. См. `gosts.dictionary.writer` — пишет через `yaml.dump(entry.date)`, что сохранит исходный формат. Но при ручном редактировании YAML — риск.

### `state.openCardId` — только одна открытая карточка

Если пользователь открыл карточку A, потом кликнул на B — A закроется, B откроется. Одновременное открытие нескольких карточек **не поддерживается**. Дизайн-решение (сохранить «чистый» вид), но для пользователя, который хочет сравнить два ГОСТа — неудобно.

### `renderTable()` вызывается целиком на каждое изменение

`innerHTML` пересоздаётся. Для 200 ГОСТов — ~200 DOM-узлов главной таблицы + 200 карточек. Быстро, но при большом числе (1000+) — заметно.

### `hashchange` сбрасывает `openCardId`

Если пользователь открыл карточку, потом кликнул на другую ссылку на странице (внутри карточки — например, «см. также» с `#gost-…`), `hashchange` сбросит `openCardId` и раскроет новую. Старая карточка закроется. Ожидаемо, но неочевидно.

### `MutationObserver` не отключается

`obs.observe(document.body, { childList: true, subtree: true })` — подписка на всё DOM. На странице с большим числом изменений — перерасход. `initGostsTable()` возвращает `true` при `data-gosts-init='1'`, так что логической ошибки нет, но лишние вызовы.

### `anchorId` fallback — расхождение с `gost.Insert`

Если `anchorId` не предвычислен (`data.js` создан до фикса #2), клиент использует `code.replace(/[^18]/g, '_').toLowerCase()` — кириллица сохраняется. `gost.Insert` (VS Code) использует `slugify_latin_alphanumeric(code)` — кириллица транслитерируется. Ссылки из VS Code ведут на `#gost-gost_1_1_2002`, а в DOM `id="gost-гост_1_1_2002"` — не совпадают, flash/expand не работают. Фикс — `gosts.injector` теперь пишет `anchorId`, но старые проекты не получат его без пересборки.