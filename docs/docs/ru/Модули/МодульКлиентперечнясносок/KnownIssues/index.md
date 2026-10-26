---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `MutationObserver` не восстанавливает таблицу

```js
var obs = new MutationObserver(function () {
    if (!document.getElementById('footnotes-container')) tick();
});
```

Если контейнер **есть**, но таблица внутри **пропала** (например, Diplodoc перерисовал содержимое контейнера) — `tick()` не сработает. Таблица не восстановится.

Фикс:

```js
var obs = new MutationObserver(function () {
    if (!document.querySelector('#footnotes-container .footnote-table')) tick();
});
```

### Retry 15 секунд

60 попыток × 250 мс = 15 секунд. Если `footnotesData` загрузился, но `.dc-doc-page__body` не появился (например, шаблон изменился) — 15 секунд таймеров. Незаметно по эффекту, но неаккуратно.

### `footnotesData` не сбрасывается между страницами

Если когда-нибудь появится SPA-навигация, `footnotesData` останется в памяти. Сейчас неактуально (Diplodoc — полная перезагрузка).

### `formatCellContent` — `stripLinks` удаляет ВСЕ ссылки

`text` может содержать `[text](url)` → в `footnoteList.collectFootnotes` уже вырезаны (через `stripLinks`). Но если в `text` попали **HTML**-ссылки (`<a href>`) — клиентский `stripLinks` удалит их ещё раз. Двойная очистка — ок.

### `esc` не оборачивает `url`

```js
return '<a class="cell-link" href="' + esc(url) + '">' + cleanText + '</a>';
```

`url` экранируется. `cleanText` — **нет**. Если в `text` был `<script>alert(1)</script>`, `stripLinks` удалит `<a>`, но `<script>` останется. Не XSS через данные пользователя (автор словаря), но стоит помнить.

### Сортировка по `article` — `localeCompare('ru')`

Для английских заголовков — `localeCompare('ru')` всё равно работает (ICU-collation), но порядок может отличаться от `localeCompare('en')`. Для мультиязычной документации — минор.

### `state` не сохраняется

При перезагрузке страницы — сброс сортировки. `localStorage` не используется. Для UX-постоянства — можно было бы сохранять `state.column`/`state.direction`. Не реализовано.

### `lang` из `footnotesData` не используется

`footnotesData.lang` (`'ru'`/`'en'`) есть в data, но клиент его не читает. `«Всего сносок: …»` — захардкожено по-русски. Если страница `en`, всё равно по-русски. Несогласовано с `core-renderer` (там I18N).