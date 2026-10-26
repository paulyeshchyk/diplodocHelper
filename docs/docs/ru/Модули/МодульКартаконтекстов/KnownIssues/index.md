---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
---


## Известные ограничения

### `getContextStatus` режет только по запятой

```js
const parts = context.split(',').map(s => s.trim()).filter(s => s !== '');
```

`split(',')` — единственный разделитель. Если в `frontmatter` написано `context: breadcrumb post-processing html` (через пробелы, без запятых), то `parts = ['breadcrumb post-processing html']`, `count = 1` — статья получит статус `low` (Мало), хотя по смыслу контекстов три.

Модуль `contexts` (pre-обработка) в `extractContextTagValue` использует другой разделитель:

```js
const terms = contextValue.split(/[\s,]+/).map(t => t.trim().toLowerCase());
```

То есть `contexts` признаёт и пробел, и запятую, а `contextmap` — только запятую. **Несогласованность форматов** между pre- и post-обработкой.

Практический эффект: если автор документации ставит `context: ` через пробел (что валидно для `contexts`), на карте контекстов статья будет выглядеть «с одним контекстом». В `context-search.client.js` (`contexts/client`) `split(',')` — тоже только запятая. То есть и `contextmap`, и клиентский поиск считают по запятой, а pre-обработка `contexts` — по запятой и пробелу. Источник расхождений — в дизайне формата `context:`.

### `helpMap` не нормализует `context`

В `app-help-contents.json` поле `context` может содержать нестандартные формы:

- с заглавными буквами (`Breadcrumb`);
- с лишними пробелами (`breadcrumb ,  post-processing`);
- с завершающей запятой (`breadcrumb,`);
- с юникод-разделителями (`breadcrumb；post-processing` — точка с запятой в китайской локали).

`contextmap` тоже не нормализует: `split(',')` даст `['breadcrumb', 'post-processing']` в лучшем случае, но `['breadcrumb', '', 'post-processing']` при двойной запятой — после `.filter(s => s !== '')` двойная запятая не создаст фантомов, а вот лишние пробелы останутся только если они внутри сегмента (после `trim` исчезнут).

То есть `contextmap` толерантен к пробелам вокруг запятых (`.trim()`), но не к другим разделителям.

### `generationContextmap` в VS Code генерирует три отчёта

Команда `diplodoc-helper.generateContextmap` (в меню `Debug`) вызывает `ux_contextmap_generate`, а та — **три** `runGeneration` подряд:

```js
runGeneration({ ..., command: 'periodicTable', ... });       // bytescounter
runGeneration({ ..., command: 'periodicTableContext', ... }); // contextmap
runGeneration({ ..., command: 'periodicTableHelpTag', ... }); // helptagmap
```

Пользователь ожидает «сгенерировать карту контекстов», а получает все три отчёта. Если это осознанное решение — стоит переименовать команду (например, `generateAllReports`) и добавить в заголовок «(все отчёты)». Если нет — разделить на три отдельные команды по имени.

### `runGeneration` в `contextmap.Generate.js` вызывается синхронно

`ux_contextmap_generate` — `async`, но внутри:

```js
runGeneration({ ... });
runGeneration({ ... });
runGeneration({ ... });
```

`await` отсутствует. `runGeneration` из `contentNavigator/generateNavigationContent.js` **синхронная** (нет `async`), поэтому `await` и не нужен. Но если в будущем кто-то сделает `generateBytesCounterPage` асинхронной (например, для ленивой загрузки данных), код в VS Code-обёртке сломается без изменений (запустит три параллельно и не дождётся).

### `lang: ["ru", "en"]` захардкожено

Как и в `bytescounter`. CLI-команда `periodicTableContext` не принимает `--langs`. Если в проекте только `ru` — вторая половина пуста («No articles for this language»). Если добавится третий язык — правка кода.

### `navLinks` дублируются

```js
navLinks: [
    { label: 'Хэлптэги', url: 'helptagmap.html' },
    { label: 'Размеры', url: 'bytescounter.html' },
]
```

В `bytescounter`: `{ label: 'Контексты', … }, { label: 'Хелптаги', … }` (обрати внимание — «Контексты» с маленькой «к», «Хелптаги» без «э»).
В `helptagmap`: `{ label: 'Размеры', … }, { label: 'Контексты', … }`.

Три раза одно и то же с разными формулировками («Хелптаги» vs «Хэлптэги»). Если добавится четвёртый отчёт — править все четыре места. Стоит вынести в общий `CONTENT_NAV_LINKS`.

### `preferredLang` из `localStorage` — общий для всех отчётов

Ключ `preferredLang` — один на всё семейство. Если пользователь переключился на `en` в `bytescounter`, а потом открыл `contextmap` — увидит `en`. Это работает, но при пустых данных `en` (в проекте только `ru`) выглядит как «пустая страница»: пользователь не понимает, что язык «перетёк» с прошлой вкладки.

### `ARTICLE_STATUS_I18N` читает `document.documentElement.lang`

```js
function ARTICLE_STATUS_I18N(status) {
    const uiLang = document.documentElement.lang || 'ru';
    const t = ARTICLE_STATUS_I18N_TEXTS[uiLang] || ARTICLE_STATUS_I18N_TEXTS.ru;
    return t[status] || status;
}
```

`document.documentElement.lang` выставляется в `core-renderer.js` (`renderLang` → `document.documentElement.lang = currentLang`). Если `core-renderer` по какой-то причине не отработал, `uiLang` = `'ru'` (fallback), и подписи статусов будут на русском даже для английской страницы.

### `getStatsHTML` считает статусы по **всей** матрице, а не по видимой части

Функция проходит по `matrixData.matrix`:

```js
for (const row of matrixData.matrix) {
    for (const cell of row) {
        for (const art of cell) {
            statusCounts[art.status] = (statusCounts[art.status] || 0) + 1;
            total++;
        }
    }
}
```

Это **все** статьи, включая «Текст раздела» и «Прочее». То есть в `#stats` показывается статистика по всем статьям документации, а не только по «основной части» (главам). Для `contextmap` это нормально (нас интересует весь корпус), но может удивить: «Всего статей: 487», хотя на таблице видно 400 плиток — 87 «лишних» это `index.md` разделов и «прочее».

### Наследуемые ограничения от `Pagebuilder.common`

Всё, что применимо к `bytescounter`, применимо и здесь:

- «Глава» и «Раздел» — эвристика по префиксу имени папки;
- `lang: ['ru', 'en']` захардкожено;
- `stripLinks` не используется (нет `title`-очистки);
- размер считается по `.md`.
