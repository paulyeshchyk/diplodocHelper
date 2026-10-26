---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `slug` не совпадает с `slugify_filename`

```js
const slug = context.replace(/\s+/g, '');
```

Для `context = 'product catalog'` → `slug = 'productcatalog'`. А `contexts.writer.writeTermFiles` создаёт файл `contexts/<slugify_filename('product catalog')>.html` → `contexts/product_catalog.html` (пробел → `_`, потому что `slugify_filename` заменяет `[^22]` на `_`).

`context-tags.client` использует **`label`**, не `slug` (см. `5.1-038`), так что `slug` в `__CONTEXT_ITEMS__` — вообще мёртвое поле. Но если кто-то в будущем начнёт использовать `slug` — расхождение с реальным именем файла.

Правильно — в `generateContextScript` использовать `slugify_filename` (из `utils/encoding.slugify`):

```js
const { slugify_filename } = require('../utils/encoding.slugify');
const slug = slugify_filename(context);
```

Это **одна строка** и решает проблему на будущее.

### `toLowerCase()` без `.trim()` — пробелы в label

```js
const context = c.toLowerCase();
```

`c` — уже `.trim()`-нутый в `runGeneration`:

```js
const contexts = contextMeta[1]
    .split(CONTEXT_SPLITTER)
    .map(s => s.trim())
    .filter(Boolean);
```

Так что `c` — без пробелов по краям. `.toLowerCase()` — корректно. Но если в `<meta content>` контекст с внутренними пробелами (`'product catalog'`), `label = 'product catalog'` — сохранится. Правильно.

### `split(',')` — расхождение с `contexts.extractor`

`CONTEXT_SPLITTER = ','` — только запятая. `contexts.extractor` использует `split(/[\s,]+/)` (запятая ИЛИ пробел). `contextmap`, `context-search.client`, `presetsStat` — тоже `split(',')`.

Итог: если пользователь написал `context: breadcrumb post-processing` (через пробел, без запятых) — в `<meta>` Diplodoc сгенерирует `<meta content="breadcrumb post-processing">`. `context-tags` сделает `split(',')` → `['breadcrumb post-processing']` — **один** контекст с пробелом. `contexts` (pre) — два контекста. Расхождение: на странице `contexts/breadcrumb.html` будет статья, а в чипах — `breadcrumb post-processing`.

Правильно — унифицировать splitter: `[\s,]+`.

### `lang = rel.split('/')[0]` — может быть `'index.html'`

Для `build/index.html` (корень):

- `rel = 'index.html'` (без `/`);
- `rel.split('/')[0] = 'index.html'`;
- `'index.html' || 'ru'` = `'index.html'` (строка truthy);
- `window.__CONTEXT_LANG__ = 'index.html'`.

Клиент потом использует `currentLang` в `a.href = '/' + currentLang + '/contexts/<slug>.html'` — получится `/index.html/contexts/<slug>.html`. 404.

Практически: `build/index.html` в корне — это редирект-страница Diplodoc (или `404.html`), у неё **нет** `<meta name="context">` (нет frontmatter). Так что `runGeneration` её пропустит (`contextMeta === null`). Баг не проявляется в норме, но при ручном `<meta>` — да.

Фикс — проверять, что `lang` из двух букв:

```js
const lang = /^[a-z]{2}$/i.test(rel.split('/')[0]) ? rel.split('/')[0] : 'ru';
```

### Нет идемпотентности

`runGeneration` **всегда** вставляет `<script>` перед `</body>`. При повторном запуске (watch, повторная сборка) — дубликаты.

Но! `context-tags.client` (клиент) проверяет `if (document.getElementById('context-tags-container')) return;` — то есть **клиент** идемпотентен (не создаст второй блок). Но `<script>` в HTML накапливаются: каждая копия — новый IIFE, каждая устанавливает `window.__CONTEXT_ITEMS__` (перезаписывает), каждая вызывает `insertContextTags()` — который создаст блок (первая) или выйдет (вторая+).

Итог: N копий `<script>` в HTML, N IIFE, каждый запускается, но только первый создаёт блок. Работает, но HTML «толстеет».

Фикс — маркер `id="dl-context-tags"`:

```js
if (content.includes('id="dl-context-tags"')) return;
newContent = newContent.slice(0, bodyCloseIndex) +
    '\n<script id="dl-context-tags">\n' + script + '\n</script>\n' +
    newContent.slice(bodyCloseIndex);
```

### Regex `<meta>` — жёсткий порядок атрибутов

```js
/<meta\s+name="context"\s+content="([^23]*)"\s*\/?>/i
```

Требует: `name` **перед** `content`, двойные кавычки, пробел между ними. Если Diplodoc изменит порядок (`content` перед `name`) — не сработает. Если добавит другие атрибуты (`<meta name="context" content="…" data-x="y">`) — `[^23]*` не сработает (потому что после `content="…"` ожидается `\s*\/?>`, а там ` data-x`).

Текущий Diplodoc ставит `<meta name="context" content="…">` — работает. Но при обновлении Diplodoc может сломаться.

### `fs.readFileSync(templatePath)` — без проверки существования

```js
const templatePath = path.join(__dirname, 'context-tags.client.js');
const clientScriptCode = fs.readFileSync(templatePath, 'utf8');
```

Если `context-tags.client.js` отсутствует (например, при standalone-сборке не включён в пакет) — `throw ENOENT`. `runGeneration` **не** ловит (try/catch только внутри `walk`-callback, а `generateContextScript` вызывается **внутри** callback — ловится, но `console.error` + `results.failed.push(htmlPath)`). То есть **все** страницы попадут в `failed` с одинаковой ошибкой.

Фикс — `if (!fs.existsSync(templatePath)) { console.error(…); return results; }`.

### `fs.readFileSync` на каждую страницу

`generateContextScript` вызывается для каждой страницы с `<meta name="context">`. Внутри — `fs.readFileSync(templatePath)`. Для 500 страниц — 500 чтений одного и того же файла (~10 KB). Мелочь, но можно было бы прочитать один раз в `runGeneration` и передавать строкой.

### `runGeneration` не пишет `toc.yaml` / `index.yaml`

`context-tags` — **только** инжектор. Раздел «Контексты» (`docs/ru/contexts/`) создаётся модулем [`contexts`](../МодульКонтексты/index.md), а `context-tags` добавляет чипы в **каждую** статью. Это не «страница раздела», а «блок в каждой статье».

То есть `context-tags` не требует `toc.yaml`. Правильно, но может смутить при чтении кода (другие модули с `runGeneration` создают страницы).

### `console.log` с `results.success.length` — общее число

`[ContextTags] Обработано 87 файлов, ошибок 3` — по всему `build/`. Не детализирует, **какие** файлы упали. Для отладки — `console.error` на каждый `catch` есть, но в итоговом логе — только счётчики.

### `walk` из `utils/walk.js` — симлинки

```js
function walk(dir, filter, callback) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath, filter, callback);
        else if (filter(fullPath, entry)) callback(fullPath);
    }
}
```

`entry.isDirectory()` для символической ссылки на папку — **`false`** (`withFileTypes: true` возвращает `isSymbolicLink()` для символов). Значит, симлинки-папки **пропускаются**. Для `build/` не критично (там нет симлинков), но стоит помнить.

### `context-tags` не удаляет старые `<script>`

Если пользователь **изменил** `context:` в frontmatter и пересобрал — старый `<script>` останется (с прошлыми контекстами), новый добавится рядом. На странице два `<script>` с разными `__CONTEXT_ITEMS__` — выполнится **последний** (перезапишет глобальную переменную). Но в HTML — мусор.

Фикс — тот же `id="dl-context-tags"` + replace, а не append.

### `if (require.main === module)` — без проверки `docs-build.js`

Если пользователь запускает `node src/plugins/context-tags/context-tags.js` из `docs/`, скрипт обработает `./build` в `docs/build` (не `docs/../build`). `path.resolve('./build')` — относительно **cwd**. Если cwd = `docs/`, обработается `docs/build/` — не тот. Для CLI через `diplodoc-helper-cli.js` — `outputDir` передаётся явно (`./build`), это работает.

### `CONTEXT_SPLITTER = ','` — не конфигурируется

Константа в начале файла. Если пользователь использует другой разделитель (`;`, `|`) — придётся править код. Не критично (стандарт — запятая), но негибко.

### `context-tags` и `context-search.client` — рассинхрон

`context-search.client` (клиент на странице `contexts/index.html`) — использует `split(',')`, как и `context-tags`. `contexts.extractor` (pre) — `split(/[\s,]+/)`. Три модуля, два разных подхода. Если пользователь пишет `context: breadcrumb post-processing` (без запятых):

- `contexts` (pre) — 2 контекста, страницы `breadcrumbs.html` и `post-processing.html` созданы;
- `context-tags` (post, этот модуль) — 1 контекст `'breadcrumb post-processing'`, чип ведёт на `contexts/breadcrumb%20post-processing.html` — 404;
- `context-search.client` — 1 контекст `'breadcrumb post-processing'`, статья не находится при поиске по `breadcrumb`.

Три модуля, три разных результата. Унификация — отдельная задача (не в этом модуле).