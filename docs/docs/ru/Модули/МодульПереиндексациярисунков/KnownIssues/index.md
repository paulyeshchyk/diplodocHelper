---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Только `ru` в `docs-build.js`

Как `reindexFootnotes` и `footnoteNumbering`. Для `en` — не вызывается. Английская документация сохранит исходную нумерацию.

### Регулярка `<figcaption>` — жёсткая по формату

```js
const regex = /<figcaption\s+class="imageDescription"([^37]*?)\s+id="([^38]+)"([^37]*?)>([\s\S]*?)<\/figcaption>/gi;
```

Требует:

- `class="imageDescription"` — **до** `id` (порядок важен);
- двойные кавычки (не одинарные);
- `id` — сразу после `class` с пробелом.

Если пользователь напишет `<figcaption id="fig-1" class="imageDescription">` (id первым) — **не сработает**. Аналогично `<figcaption class='imageDescription' id='fig-1'>` (одинарные кавычки) — **не сработает**.

`figures.extractor` использует такой же regex — совпадёт поведение.

### `uniqueKey` — path-specific

`mapping.set(uniqueKey, counter)`, где `uniqueKey = ${path.resolve(mdFilePath)}::${id}`. Если одна и та же картинка referenced из двух файлов с **одинаковым** `id="fig-foo"` — два разных ключа, каждый получит свой номер. Это правильно для нумерации подписей, но:

- если пользователь скопировал `<figure>` из статьи A в статью B (с тем же `id`), обе подписи получат **разные** номера (правильно);
- но `mapping` **не предупреждает** о дубликатах. Если `id` одинаковый — при `#fig-foo` в ссылке из статьи C **непонятно**, в какую из двух подписей ведёт ссылка. При этом `updateFigureLinksInFile` резолвит от `targetMdPath` (путь целевого `.md`), так что если `pathPart` в ссылке указывает на A — попадёт в A, на B — в B. Работает.

### `updateFigureLinksInFile` — только `[text](path#fig-…)`

Regex:

```js
const linkRegex = /\[([^39]]+)\]\(([^40]*?)(#fig-[^40]+)\)/g;
```

Только markdown-ссылки. **Не** находит:

- `<a href="…#fig-…">`;
- reference-style `[text][ref]` + `[ref]: url#fig-…`;
- `<figcaption>` в исходнике (это не ссылка, а определение).

Если пользователь ссылается на рисунок через `<a>` — номер не обновится.

### `updateFigureLinksInFile` — только `#fig-…`

`#fig-` — префикс `id` (из `buildFigureId`). Если пользователь создал `<figure>` вручную с `id="my-figure"` (без `fig-`) — ссылка `[text](path#my-figure)` **не** будет обновлена. `pass 1` тоже не тронет — regex требует `id="…"` (без `#`), но `pass 2` требует `#fig-`. Расхождение.

### `template.replace('{0}', ...)` — только первое вхождение

```js
const newLinkText = template.replace('{0}', (newNumber ?? '').toString());
```

`String.prototype.replace` с строкой-паттерном заменяет **первое** вхождение. Если в `figureReferenceCaptionPrefix` несколько `{0}` (что странно, но возможно) — заменится только первое.

### `innerText` — только первый уровень форматирования

```js
const formatPatterns = [
    { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' },
    { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' },
];
```

Разбирает `*text*`, `**text**`, `_text_`, `__text__`. **Не** разбирает:

- `***bold italic***` (три звёздочки);
- `*text with **bold** inside*` (вложенное форматирование);
- markdown-ссылки внутри `linkText` (например, `[см. [раздел]](…)`).

`innerText` используется только для определения `рис`/`fig` — если внутри `linkText` есть эти слова, но в обрамлении другого формата — шаблон не распознается.

### `pass 1` — `captionText` захватывает `[\s\S]*?`

`([\s\S]*?)` — любой текст, включая переносы строк. Если внутри `<figcaption>` есть `<strong>` или markdown — они сохранятся как есть. Но:

- `cleaned` = `captionText.replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '').replace(/^\d+\.\s*/, '').trim()` — только **первый** префикс удаляется. Если в подписи `Рисунок 1. Рисунок 2. Текст` (двойной) — удалится первый, второй останется.
- `trim()` — обрезает пробелы в начале/конце.

### `figureCounter` — глобальный, но `pass 1` не идемпотентна

Повторный запуск `reindexFigures` пересчитает с `figureCounter = 1`, но номера уже правильные — `changed` не сработает (если номера не изменились). Идемпотентна по результату, но **не** по логу (`console.log('+N рис.')` при каждом запуске, даже если ничего не изменилось).

### `targetLocale !== activeLocale` → жёстко `«Figure»`

```js
function GetPrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureCaptionPrefix || 'Figure';
}
```

Если пользователь в настройках `figureCaptionPrefix: «Рисунок»` (для `ru`), но передал `targetLocale: 'en'` — получит `«Figure»`. Логика: «если язык не совпадает с активным, использовать английский». Не баг, но негибко.

### `DiplodocConfigFromJson(configJsonOrObj)` — две разные реализации

В `reindexer.figures.js` импорт:

```js
const { DiplodocConfigFromJson } = require('../manifest/config/diplodoc.config');
```

В `manifest/config/diplodoc.config.js`:

```js
function DiplodocConfigFromJson(json) {
    if (typeof json === 'string') {
        try { return JSON.parse(json); } catch (err) { … }
    } else if (json && typeof json === 'object') {
        return { ...DefaultDiplodocConfig(), ...json };
    }
    return DefaultDiplodocConfig();
}
```

Для **строки** — `JSON.parse` (без `DefaultDiplodocConfig` merge). Для **объекта** — merge с default. Значит, если config приходит как строка (из env `CLI_CONFIG`), поля без явного значения останутся `undefined` — `GetPrefixOrDefault` использует fallback.

Работает, но тонко.

### `updateFigureLinksInFile` — не пишет `console.log` при обновлении

Комментарий в коде:

```js
// if (updated) {
//     fs.writeFileSync(filePath, newContent, 'utf8');
//     // console.log(`Обновлены ссылки в ${path.relative(process.cwd(), filePath)}`);
// }
```

`console.log` закомментирован. При отладке непонятно, **какие** файлы обновлены. Только суммарное `Готово. Всего пронумеровано: N`.

### `rootDir` — не проверяется

`fs.readFileSync(mdFilePath)` в `pass 1` и `pass 2`. Если `.md` удалён между `collectMdFilesInOrder` и `readFileSync` (race condition) — `throw`, `catch` ловит, `console.error`. Файл пропускается, но остальные обрабатываются.

### `success: false` в `reindexFigures` при отсутствии `toc.yaml`

`{ success: false, reason: 'no_toc' }`. VS Code покажет `showWarningMessage`. Но `reindexFigures` **не** создаёт `toc.yaml` (это ответственность `@diplodoc/cli`/пользователя). Если пользователь удалил `toc.yaml` вручную — придётся восстанавливать из git.

### Нет CLI-опции для `--locale` / `--config`

`targetLocale` и `configObj` берутся из `process.env.CLI_LOCALE` / `process.env.CLI_CONFIG` (через `DiplodocConfigFromCli`). Если пользователь хочет явно `--locale en` — только через env. Несогласовано с `--docsDir` / `--outputDir` (которые через аргументы).