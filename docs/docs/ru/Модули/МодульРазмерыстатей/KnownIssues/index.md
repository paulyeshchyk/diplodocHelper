---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Средний размер считается по `.md`, а не по HTML

`helpMap` кладёт в JSON поле `size` = размер **исходного `.md`-файла**. `bytescounter` использует именно его для `avgSize` и `getArticleStatus`. Если статья насыщена таблицами, `{% cut %}`, `{% list tabs %}` — её HTML-версия в 3–10 раз больше `.md`, но в отчёте она будет выглядеть «маленькой».

Внутренняя консистентность соблюдается (все статьи сравниваются по `.md`), но при обсуждении с командой «почему у нас средний размер 8 КБ» — надо помнить, что это про исходники, а не про то, что видит пользователь.

### «Глава» и «Раздел» — эвристика по имени папки

`parseUrlParts(url)` ищет префиксы `Раздел` / `Глава` в сегментах URL. То есть папка должна начинаться с «Раздел 1 …» / «Глава 3 …» (или `Раздел1…` без пробела — `getSectionNumber` / `getChapterNumber` ищут `^Раздел(\d+)` в `sectionName` без учёта пробела).

Если у пользователя папки называются по-другому (`Часть 1`, `Section A`, `01_Введение`), `sectionName` / `chapterName` будут `null`, все статьи попадут в `«Без раздела»` / `«Без главы»`. Диагностики нет — таблица отрендерится, но вся структура «схлопнется» в одну колонку «Без раздела» и одну строку «Без главы».

### `Pagebuilder.common` — общий, но не экспортируется как «библиотека»

Функции `buildMatrix`, `buildSectionsMap`, `getArticleStatus`, `generateGenericTableFromArticles` лежат в `Pagebuilder.common.js` и экспортируются:

```js
module.exports = { generateGenericTableFromArticles, buildMatrix };
```

Только `buildMatrix` и `generateGenericTableFromArticles`. Внутренние `buildSectionsMap`, `getArticleStatus`, `parseUrlParts`, `renderFile` не экспортируются — расширить «поведение» снаружи нельзя. Если понадобится `bytescounter` для нестандартного проекта (другие префиксы папок), придётся либо форкнуть модуль, либо расширить экспорт.

### Цвет статуса захардкожен в трёх местах

`status → colorClass` определяется в:

- `Pagebuilder.Config.Bytescounter.js` — `LEGEND_ITEMS` (для легенды);
- `bytescounter.js` — `colorMap` (для клиента);
- `core-renderer.js` — `renderStatusCell` (fallback `colorMap`, не используется для `bytescounter`, но есть).

Если поменять цвета (например, `color-excess` → `color-red`), надо править CSS, `LEGEND_ITEMS` и `colorMap` — три места вместо одного.

### `periodicTable` — имя CLI-команды, не совпадает с модулем

Команда `periodicTable` генерирует `bytescounter.html`. Логично было бы назвать `bytescounter`, но `periodicTable` — историческое имя. В `docs-build.js` тоже `cli('periodicTable')`. При поиске «как сгенерировать bytescounter» пользователь может не догадаться, что команда называется иначе.

### `navLinks` дублируются между отчётами

У `bytescounter`:

```js
navLinks: [
    { label: 'Контексты', url: 'contextmap.html' },
    { label: 'Хелптаги', url: 'helptagmap.html' },
]
```

У `contextmap`:

```js
navLinks: [
    { label: 'Хэлптэги', url: 'helptagmap.html' },
    { label: 'Размеры', url: 'bytescounter.html' },
]
```

У `helptagmap`:

```js
navLinks: [
    { label: 'Размеры', url: 'bytescounter.html' },
    { label: 'Контексты', url: 'contextmap.html' },
]
```

Три раза одно и то же с разным порядком и формулировками («Хелптаги» vs «Хэлптэги»). Если добавится четвёртый отчёт — надо будет править все четыре места. Стоит вынести в общий констант (`CONTENT_NAV_LINKS`), но это уже рефакторинг.

### `lang: ["ru", "en"]` — захардкожено

В `generateBytesCounterPage` вызов:

```js
generateGenericTableFromArticles({ …, lang: ['ru', 'en'], … });
```

CLI-команда `periodicTable` не принимает `--langs`. Если в проекте только `ru` — `en`-половина будет пустой (`totalArticles: 0`, «Нет статей для этого языка»). Если появится третий язык (`de`) — нужно править код.

### `core-renderer` читает `preferredLang` из `localStorage`

```js
const savedLang = localStorage.getItem('preferredLang');
```

Ключ `preferredLang` — общий для всех отчётов (`bytescounter`, `contextmap`, `helptagmap`). Если пользователь переключился на `en` в `bytescounter`, а потом открыл `contextmap` — там тоже будет `en`. Хорошо для консистентности, но неочевидно: пользователь не ждёт, что выбор языка «перетекает» между страницами. Если `en`-данных в `contextmap` нет (`totalArticles: 0`), пользователь увидит «No articles for this language», хотя `ru`-данные есть.

### `stripLinks` в `footnoteList` и `bytescounter` — разные

Не баг этого модуля, но при отладке стоит помнить: `contentNavigator`-модули не используют общий `stripLinks`. У `bytescounter` его вообще нет (он работает только с `title`, `size`, `url`), у `footnoteList` — свой. Единого подхода в семействе нет.