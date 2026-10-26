---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Не подключается автоматически

`contexts` копирует скрипт в `docs/_assets/scripts/context-search.js`, `@diplodoc/cli` переносит в `build/_assets/scripts/`. Но `<script>` в HTML **не** вставляется. Пользователь должен сам добавить в `.yfm` или в `contexts/index.md`. Без подключения — интерфейс поиска не появится, панель «Поиск» будет пустой.

### `split(',')` без пробелов — расхождение с `contexts`

`contexts.extractor` использует `split(/[\s,]+/)` (запятая ИЛИ пробел). `context-search.client` (и `contextmap`, и `helpMap`) — `split(',')` (только запятая). Пользователь, написавший `context: breadcrumb post-processing` (без запятых), увидит одно «контекстное значение» `breadcrumb post-processing`. В `contexts` это два терма, здесь — один.

### `terms.every()` — точное совпадение

`invoice` не найдёт `invoice-line`. Нет префиксного поиска или регекспа. Пользователь должен вводить точные контексты.

### `hintDiv` — только по последнему слову

`updateHint()` ищет подсказки только по **последнему** слову в инпуте. Если пользователь набрал `nomen invo` — подсказки по `invo`, а не по `nomen`. Логично (текущий ввод), но не помогает «найти следующий контекст».

### `preferredLang` не используется

В отличие от `core-renderer`, `context-search.client` не читает `localStorage.preferredLang`. Язык определяется по URL (`getLang()`) — первый сегмент пути `(/ru/|/en/)`. Если пользователь открыл `contexts/index.html` в `en`, но `preferredLang` = `ru` (из `bytescounter`) — поиск всё равно будет `en`. Не баг, но несогласовано.

### `contextData` не сбрасывается между инициализациями

Если `tryInitialize` вызовется на новой странице (Diplodoc делает полную перезагрузку, но если в будущем появится SPA-навигация) — `dataLoaded` останется `true`, `contextData` — от старой страницы. Сейчас неактуально.

### `JSON.parse` ошибки не логируются

`buildSearchDataFromAppHelp` вызывается внутри `.then`, если `JSON.parse` внутри `r.json()` упадёт — `.catch` перехватит, `console.error`, `contextData = { ru: [], en: [] }`. Работает, но пользователь не поймёт, что JSON битый.