---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `t` вычисляется один раз при загрузке модуля

```js
const uiLang = document.documentElement.lang || 'ru';
const t = I18N[uiLang] || I18N.ru;
```

`document.documentElement.lang` на момент выполнения скрипта (`defer`) — изначально `'ru'` (или пустой). `initApp` потом ставит `document.documentElement.lang = currentLang`, но `t` уже вычислен. То есть при `en`-странице `t` — русский.

Практически: `renderTable` использует `t.chapterHeader`, `t.noData` и т.д. — они по-русски даже для `en`. `config.getStatsHTML` получает `t` как аргумент, но тоже с русскими значениями.

Фикс — пересчитывать `t` внутри `renderTable`:

```js
function renderTable(lang, matrixData, config) {
    const t = I18N[lang] || I18N.ru;
    // …
}
```

Или — в `initApp` перед `renderTable`:

```js
const t = I18N[currentLang] || I18N.ru;
```

(но `t` — в замыкании модуля, надо переделать).

### `renderStatusCell` — мёртвый код

```js
function renderStatusCell(status, container) {
    if (!container) return;
    const colorMap = { … };
    const colorClass = colorMap[status.status] || 'color-empty';
    const displayText = status.value !== undefined ? status.value : '';
    container.innerHTML = `<div class="status-cell ${colorClass}" title="${status.label}: ${status.value}">${displayText}</div>`;
}
```

Функция определена, но **не используется**. `renderArticles` рендерит `<a class="article-block">` напрямую, не через `renderStatusCell`.

Мёртвый код ~10 строк.

### `renderArticles` — inline-стили `display:grid`

```js
let html = `<div style="display:grid; grid-template-columns: repeat(${cols}, 3ch); gap:3px; …">`;
```

Стили в атрибуте `style` — не через CSS-класс. Для `core-style.css` — громоздко, но работает. Если появится тема, которая хочет переопределить grid — придётся через `!important`.

### `article-block` — размер `3ch × 3ch` фиксирован

Для больших экранов — слишком мелко; для маленьких — нормально. Адаптивности нет.

### `#cell-R-C` — глобальный `id`

```html
<td><div id="cell-${r}-${c}"></div></td>
```

`id` начинается с `cell-0-0`, `cell-0-1`, … — уникальны в пределах страницы. Но если на одной странице несколько таблиц (например, два `bytescounter` в разных языках — не бывает, но теоретически) — коллизия.

Практически не встречается (один отчёт = одна таблица).

### `config.getTitle` — не экранирует `art.title`

```js
getTitle(art, t) { return `${art.title} (${art.size} ${t.bytes})`; }
```

`art.title` вставляется в `title="…"` (HTML-атрибут). Если `title` содержит `"` — сломает атрибут. `Pagebuilder.common` не экранирует `title` при создании `matrixData`. Симптом: тултип плитки обрезается на первой кавычке.

### `preferredLang` — общий для всех трёх отчётов

`localStorage.preferredLang` — один ключ на всё семейство. Переключение языка в `bytescounter` влияет на `contextmap` и `helptagmap`. Хорошо для консистентности, но пользователь не ожидает «перетекания».

### `article-block` — все ссылки `target="_blank"`

```js
html += `<a href="${art.url}" target="_blank" class="article-block …">`;
```

Открывает в новой вкладке. Для внутренних ссылок документации — нестандартно (Diplodoc обычно без `target=_blank`). Пользователь кликает по плитке, открывается новая вкладка с той же документацией.

### `renderLegend` — глобальный поиск `#legend-container`

```js
container = document.getElementById('legend-container');
```

Если контейнера нет — `console.warn`. Для `page-template.html` — есть. Если шаблон изменится — легенда не отрендерится.

### `getStatsHTML` вызывается с `t` из модуля

`config.getStatsHTML(lang, matrixData, t)` — `t` из замыкания `core-renderer` (русский, см. первое ограничение). Модули ожидают, что `t` соответствует `lang`, но получают `ru`-вариант.

### `renderLang` использует `localStorage` без проверки доступности

```js
const savedLang = localStorage.getItem('preferredLang');
```

В `private browsing` / `file://` — `localStorage` может бросить `SecurityError`. Не поймано — скрипт падает, все три отчёта не рендерятся.

### `renderLang` — не перерисовывает `navLinks`/`legend`

При клике на кнопку `EN` — только `renderTable` вызывается. `navLinks` и `legend` остаются от `ru`. Для `navLinks` — терпимо (ссылки одинаковые). Для `legend` — описания на `ru` (например, «Избыток (>6)»).

Фикс — в обработчике клика: `renderLegend(legendItems)` с обновлённым `t`. Но `legendItems` — из `periodicData` (в замыкании `initApp`), надо прокидывать.