---
title: Модуль. Контекстные теги
sectionType: Page
pureTitle: Контекстные теги
context: context-tags, context, post-processing, html
capability: navigation
family:
layer:
---

|               |                                                                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID            | [4.2-045](../../../%D0%A1%D0%BE%D0%B3%D0%BB%D0%B0%D1%88%D0%B5%D0%BD%D0%B8%D1%8F/index.md#identifikaciya-modulej)                                                                                                                                                     |
| Идентификатор | `context-tags`                                                                                                                                                                                                                                                    |
| Наименование  | Контекстные теги                                                                                                                                                                                                                                                  |
| Слой          | [Post-processing](../../%D0%A1%D0%BB%D0%BE%D0%B8layer/%D0%A1%D0%BB%D0%BE%D0%B9Postprocessing/index.md#naznachenie)                                                                                                                                                                           |
| Каталог       | [Навигация](../../%D0%9A%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3Capabilitymap/%D0%9A%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F/index.md#navigaciya)                                                                                                                                                                                                                                                                  |
| Семейство     | [Контекстные теги](../../%D0%A1%D0%B5%D0%BC%D0%B5%D0%B9%D1%81%D1%82%D0%B2%D0%BEfamily/%D0%A1%D0%B5%D0%BC%D0%B5%D0%B9%D1%81%D1%82%D0%B2%D0%BE%D0%9A%D0%BE%D0%BD%D1%82%D0%B5%D0%BA%D1%81%D1%82%D0%BD%D1%8B%D0%B5%D1%82%D0%B5%D0%B3%D0%B8/index.md#fam-context-tags) |
| Расположение  | `src/plugins/context-tags/context-tags.js` (инжектор)                                                                                                                                                                                                             |
| Точка входа   | `runGeneration(buildDir)`                                                                                                                                                                                                                                         |
| Версия        | `1.54.0`                                                                                                                                                                                                                                                          |
| Назначение    | Встраивает в HTML клиентский скрипт, который рисует в конце статьи чипы её `context`-тегов                                                                                                                                                                        |

{: .page-legend }

## Назначение

`context-tags` — серверная часть «тегов контекстов». Обходит `build/**/*.html`, для каждой страницы читает `<meta name="context" content="…">` (Diplodoc генерирует из frontmatter `context:`), и **встраивает** в `</body>` инлайн-`<script>` с:

```js
window.__CONTEXT_ITEMS__ = [{ label, slug }, …];
window.__CONTEXT_LANG__ = 'ru';
// + тело context-tags.client.js
```

Клиентская часть ([`context-tags.client`](../МодульКлиентаконтекстныхтегов/index.md)) читает эти данные и рисует в конце статьи блок **«Контексты:»** — чипы со ссылками на страницы `contexts/<slug>.html`.

Зачем это нужно. В каждой статье уже есть `context: …` во frontmatter, но **читатель** её не видит — это метаданные для поиска. `context-tags` показывает контексты в конце статьи — как «теги» — чтобы:

1. читатель видел, к какой предметной области относится статья;
2. мог кликнуть на контекст и перейти на страницу **всех** статей с этим контекстом (создан [`contexts`](../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9A%D0%BE%D0%BD%D1%82%D0%B5%D0%BA%D1%81%D1%82%D1%8B/index.md));
3. через эту страницу — найти смежные статьи.

Серверная часть — простая: обход + regex + инъекция. Клиентская — сложнее (сортировка, чипы, «ещё N»/«свернуть»). Обе части — в одной паре модулей, но описаны раздельно (этот — `4.2-045`, клиент — `5.1-038`).

## Применение

**Когда использовать:** у статей есть `context:` во frontmatter, и нужно показать их читателю **в конце каждой статьи** — как чипы со ссылками на страницы `contexts/<slug>.html`.

**Когда НЕ использовать:** `context:` не размечен — чипов не будет; нужна страница-указатель — `contexts`; поиск — `context-search.client`.

**Альтернативы:**
- Ручное перечисление контекстов в каждой статье — рассинхронизируется.
- `contextmap` — визуальная карта, не чипы в конце статьи.

**Типичный сценарий:** `docs-build.js` → `post` → `contexttags` обходит `build/*.html`, читает `<meta name="context">`, встраивает `<script>` с `__CONTEXT_ITEMS__` → `context-tags.client` рисует чипы.

## Как это работает

```mermaid
flowchart TB
    subgraph entry[CLI]
        CMD["CLI: contexttags<br/>(docs-build post)"]
    end
    subgraph inject[runGeneration(buildDir)]
        WALK["walk(buildDir, isHtmlFile)"]
        META["regex:<br/>&lt;meta name=&quot;context&quot;<br/>content=&quot;…&quot;&gt;"]
        SPLIT["split(',') → trim → filter"]
        GEN["generateContextScript<br/>(contexts, htmlPath, buildDir)"]
        INJ["replace('&lt;/body&gt;',<br/>'&lt;script&gt;…&lt;/script&gt;\n&lt;/body&gt;')"]
    end
    subgraph build[build/]
        HTML["build/**/*.html"]
    end
    subgraph client[Client runtime]
        CL[context-tags.client]
        UI["#context-tags-container<br/>+ чипы + кнопка «ещё»"]
    end
    CMD --> WALK
    WALK --> HTML
    HTML --> META
    META --> SPLIT
    SPLIT --> GEN
    GEN --> INJ
    INJ --> HTML
    HTML --> CL
    CL --> UI
```

### Фаза 1. `runGeneration(buildDir)`

```js
function runGeneration(buildDir) {
    const results = { success: [], failed: [] };
    if (!fs.existsSync(buildDir)) {
        console.error(`❌ [ContextTags] Папка сборки не найдена: ${buildDir}`);
        results.failed.push(buildDir);
        return results;
    }

    const filter = fullPath => isHtmlFile(fullPath);
    walk(buildDir, filter, htmlPath => {
        try {
            const content = fs.readFileSync(htmlPath, 'utf8');
            const contextMeta = content.match(/<meta\s+name="context"\s+content="([^11]*)"\s*\/?>/i);
            if (!contextMeta) return;

            const contexts = contextMeta[1]
                .split(CONTEXT_SPLITTER)
                .map(s => s.trim())
                .filter(Boolean);
            if (contexts.length === 0) return;

            const script = generateContextScript(contexts, htmlPath, buildDir);
            if (!script) return;

            let newContent = content;
            const bodyCloseIndex = newContent.lastIndexOf('</body>');
            if (bodyCloseIndex === -1) {
                console.warn(`[ContextTags] Нет </body> в: ${htmlPath}`);
                return;
            }
            newContent =
                newContent.slice(0, bodyCloseIndex) +
                '\n<script>\n' +
                script +
                '\n</script>\n' +
                newContent.slice(bodyCloseIndex);
            fs.writeFileSync(htmlPath, newContent, 'utf8');
            results.success.push(htmlPath);
        } catch (err) {
            console.error(`❌ [ContextTags] Ошибка при обработке ${htmlPath}:`, err);
            results.failed.push(htmlPath);
        }
    });

    console.log(`[ContextTags] Обработано ${results.success.length} файлов, ошибок ${results.failed.length}`);
    return results;
}
```

1. **Проверка `buildDir`** — если нет, `{ success: [], failed: [buildDir] }`.
2. **`walk(buildDir, isHtmlFile, callback)`** — рекурсивный обход, только `.html`. Из `utils/walk.js` — та же функция, что в `breadcrumb.collector`.
3. **Для каждого HTML:**
   - читает содержимое;
   - **regex** `/<meta\s+name="context"\s+content="([^11]*)"\s*\/?>/i` — ищет `<meta name="context" content="…">`;
   - если нет — пропуск (страница без контекстов);
   - `split(',')` → `trim()` → `filter(Boolean)` → массив контекстов;
   - `generateContextScript(contexts, htmlPath, buildDir)` — формирует `<script>`-строку;
   - **инъекция** — `<script>\n${script}\n</script>\n` перед `</body>`.
4. **`console.log`** — `[ContextTags] Обработано N файлов, ошибок M`.

**`CONTEXT_SPLITTER = ','`** — только запятая. Расхождение с `contexts.extractor` (`split(/[\s,]+/)`), `contextmap`, `context-search.client`, `presetsStat` — см. «Известные ограничения».

### Фаза 2. `generateContextScript(contexts, htmlPath, buildDir)`

```js
function generateContextScript(contexts, htmlPath, buildDir) {
    const rel = path.relative(buildDir, htmlPath).replace(/\\/g, '/');
    const lang = rel.split('/')[0] || 'ru';
    const contextItems = contexts.map(c => {
        const context = c.toLowerCase();
        const slug = context.replace(/\s+/g, '');
        return { label: context, slug: slug };
    });

    const templatePath = path.join(__dirname, 'context-tags.client.js');
    const clientScriptCode = fs.readFileSync(templatePath, 'utf8');

    const injectedVars = [
        `window.__CONTEXT_ITEMS__ = ${JSON.stringify(contextItems)};`,
        `window.__CONTEXT_LANG__ = ${JSON.stringify(lang)};`,
    ].join('\n');

    return `${injectedVars}\n${clientScriptCode}`;
}
```

- **`rel`** — путь HTML относительно `buildDir`. `ru/Модули/МодульХлебныеКрошки/index.html`.
- **`lang`** — первый сегмент (`'ru'` / `'en'`). Если HTML в корне (`build/index.html`) — `'index.html'` (некорректно, но `|| 'ru'` не сработает, т.к. `split('/')[0]` — `'index.html'`, не пустая строка). См. «Известные ограничения».
- **`contextItems`** — `[{ label, slug }]`:
  - `label = c.toLowerCase()` — видимое имя (lowercase);
  - `slug = label.replace(/\s+/g, '')` — без пробелов. **Не** `slugify_filename`. См. «Известные ограничения».
- **`clientScriptCode`** — **читается из файла** `context-tags.client.js` (соседний). Не кэшируется — `fs.readFileSync` на **каждую** страницу.
- **`injectedVars`** — `window.__CONTEXT_ITEMS__ = …;\nwindow.__CONTEXT_LANG__ = …;` — глобальные переменные для клиента.
- **Возврат** — `injectedVars + '\n' + clientScriptCode`.

**Итог:** инлайн-`<script>` с данными и клиентским кодом. Никакого `fetch`, никакой внешней зависимости.

### Фаза 3. Клиент

Клиентский код (`context-tags.client.js`) описан отдельно — [`context-tags.client`](../МодульКлиентаконтекстныхтегов/index.md). Здесь — только контракт:

- **`window.__CONTEXT_ITEMS__`** — массив `{ label, slug }`;
- **`window.__CONTEXT_LANG__`** — `'ru'` / `'en'`.

Клиент использует `label` для текста чипа и `encodeURIComponent(label)` для `href` — **`slug` не используется**. См. `context-tags.client`, «Известные ограничения» — баг с контекстами, содержащими пробел.

### Файлы модуля

| Файл                                              | Ответственность                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/plugins/context-tags/context-tags.js`        | `runGeneration`, `generateContextScript`                                        |
| `src/plugins/context-tags/context-tags.client.js` | Клиент — см. [`context-tags.client`](../МодульКлиентаконтекстныхтегов/index.md) |
| `src/plugins/utils/walk.js`                       | `walk(dir, filter, callback)` — обход                                           |
| `src/plugins/utils/html.utils.js`                 | `isHtmlFile`                                                                    |

### Формат `<meta name="context">`

```html
<meta name="context" content="breadcrumb, post-processing, html">
```

Diplodoc генерирует из frontmatter:

```yaml
context: breadcrumb, post-processing, html
```

`content` — **одна строка**, разделители — запятые. Значения — lowercase (Diplodoc сам приводит).

## Режимы работы

### CLI

```bash
node ./plugins/diplodoc-helper-cli.js contexttags --outputDir ./build
```

| Аргумент      | Обязателен | По умолчанию | Описание       |
| ------------- | ---------- | ------------ | -------------- |
| `--outputDir` | нет        | `./build`    | Каталог сборки |

В `diplodoc-helper-cli.js`:

```js
} else if (command === 'contexttags') {
    generateContexttags(outputDir);
}
```

### Сборочный пайплайн

В `docs-build.js`, фаза `post`:

```js
cli('contexttags', './build'),
```

Идёт **после** `breadcrumb`, до `ganttFixScroll`. **Правильное место** (в отличие от `tocCleanMode`).

Пропускается флагом `--skip=contexttags`.

### VS Code

Собственной команды нет. Только через CLI или `docs-build.js`.

### CLI-режим в модуле

```js
if (require.main === module) {
    const buildDir = path.resolve('./build');
    runGeneration(buildDir);
}
```

Если запускать `node src/plugins/context-tags/context-tags.js` — обработает `./build` в текущей директории. Полезно для ручной отладки.

## Юнит-тесты

{% include [unit tests](./unittests.md) %}

{% include [unit tests](../../../_includes/unittests.legend.md) %}

## Связи

`context-tags` — один из «инъекторов» в post-processing. Пары:

| Модуль                                                                                                                                                                       | Что вставляет                             | Где читается                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| **`context-tags`**                                                                                                                                                           | `<script>` с `__CONTEXT_ITEMS__` + клиент | [`context-tags.client`](../МодульКлиентаконтекстныхтегов/index.md) |
| [`breadcrumb`](../МодульХлебныеКрошки/index.md)                                                                                                                              | `<script>` с картой заголовков            | inline в скрипте                                                   |
| [`roadmap.patcher`](../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9F%D0%B0%D1%82%D1%87%D0%B5%D1%80%D0%93%D0%B0%D0%BD%D1%82%D0%B0/index.md) | `<script>` с pan/zoom                     | inline в скрипте                                                   |
| [`abbrs`](../МодульАббревиатуры/index.md) (injector)                                                                                                                         | `<div class="dl-abbr">` + `<script>`      | [`abbrs.client`](../МодульКлиентаббревиатур/index.md)              |
| [`terms`](../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%A2%D0%B5%D1%80%D0%BC%D0%B8%D0%BD%D1%8B/index.md) (injector)                        | `<div class="dl-term">` + `<script>`      | [`terms.client`](../МодульКлиентатерминов/index.md)                |

`context-tags` — **единственный**, кто инжектит `<script>` **инлайн** (с содержимым клиента прямо в HTML), не через `<script src>`. Плюс — не требует отдельного `.css` (стили в клиенте).

С [`contexts`](../%D0%A0%D0%B5%D0%B5%D1%81%D1%82%D1%80/%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%9A%D0%BE%D0%BD%D1%82%D0%B5%D0%BA%D1%81%D1%82%D1%8B/index.md) — связан **источником данных**: `contexts` генерирует страницы `contexts/<slug>.html`, на которые ссылается клиент `context-tags.client`. Если `contexts` не запущен, ссылки в чипах — 404.

С [`context-search.client`](../МодульКлиентскогопоиска/index.md) — **не пересекается**: тот на `contexts/index.html` (страница всех контекстов), `context-tags.client` — в конце каждой статьи. Оба работают с контекстами, но разные задачи.

{% cut "Диаграмма связей" %}

```mermaid
flowchart TB
    subgraph pre[Pre-processing]
        CTX[contexts<br/>(генератор страниц)]
    end
    subgraph build1[Сборка]
        CLI["@diplodoc/cli"]
        HTML1["build/**/*.html<br/>(с &lt;meta name=&quot;context&quot;&gt;)"]
    end
    subgraph post[Post-processing]
        CT[context-tags<br/>runGeneration]
    end
    subgraph client[Client runtime]
        CC[context-tags.client]
    end
    subgraph fs[build/]
        HTML2["build/**/*.html<br/>+ &lt;script&gt; __CONTEXT_ITEMS__"]
        CTXPG["build/ru/contexts/&lt;slug&gt;.html"]
    end
    CTX --> CTXPG
    CLI --> HTML1
    HTML1 --> CT
    CT --> HTML2
    HTML2 --> CC
    CC --> CTXPG
```

{% endcut %}
