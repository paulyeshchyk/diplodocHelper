---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Переключатель list/grid и лайтбокс не работают из коробки

`writeFigureList` генерирует:

```html
<div class="figures-view-switch" role="tablist">
  <button type="button" data-figures-view="list" aria-pressed="true">Список</button>
  <button type="button" data-figures-view="grid" aria-pressed="false">Сетка</button>
</div>
<div class="figures-container" data-view="list">
  <table class="figures-table">…</table>
  <div class="figures-grid">…</div>
</div>
```

Но **никакого клиентского скрипта модуль не инжектит**: `data-figures-view` / `data-view` никто не слушает. Переключатель визуально присутствует, но не работает, пока тема (или `_assets/scripts/`) не подгрузит соответствующий скрипт. То же с `js-lightbox-trigger` на `<img>` — лайтбокса в модуле нет.

Починка: либо инжектить небольшой inline-скрипт (по аналогии с `abbrs.client` / `terms.client`), либо задокументировать требование к теме.

### Модуль `async`, но вызывается синхронно

`runGeneration` в `figures.js` — `async`. В CLI (`diplodoc-helper-cli.js`) вызов синхронный:

```js
} else if (command === 'createFigureContent') {
    generateFigures(docsDir);  // Promise, никто не ждёт
}
```

В Node это «работает по счастливой случайности»: pending `sharp`-операции держат event loop открытым, поэтому процесс не выходит, пока превью не готовы. Но ошибки внутри `runGeneration` (кроме тех, что пойманы `try/catch`) не всплывут наружу — `process.exitCode` останется `0`.

Правильно: `await generateFigures(docsDir)` (и делать сам `diplodoc-helper-cli.js` async, или `.then()` с установкой `process.exitCode`).

### `sharp` — нативная зависимость

`src/plugins/figures/figures.js` требует `sharp` в начале файла. Это нативный модуль (C++/libvips, ~20 МБ). Для standalone-поставки `figures` придётся тянуть `sharp` — сложности с кросс-платформенной сборкой. У `gosts`, `abbrs`, `terms` этой проблемы нет (pure JS).

Если `sharp` не установлен (или не собрался под текущую платформу), модуль упадёт при `require('sharp')` ещё до того, как CLI успеет что-то сделать.

### Превью не обновляются, если изменилось изображение

`createThumbnail` пропускает файл, если `<thumbPath>` уже существует:

```js
if (fs.existsSync(extThumbPath)) return;
```

Имя — `<baseName>_<md5(путь)>.webp`. Хеш от **пути**, не от содержимого. Значит:

- переименовали файл → новое имя превью, старое останется мусором;
- изменили картинку без переименования → превью не перегенерируется;
- удалили `.md` — запись пропадёт из индекса, превью останется.

Очистки `figures/thumbs/` от «сирот» нет.

### `<figcaption>` — только двойные кавычки, одна строка

Регулярка в extractor:

```
/<figcaption\s+class="imageDescription"([^13]*?)\sid="([^14]+)"([^13]*?)>([\s\S]*?)<\/figcaption>/gi
```

Требует именно `class="..."` с двойными кавычками. Одинарные не сработают. Также `<figcaption>` должен быть на одной строке (`[^13]*?` не проглатывает `\n` перед `>`).

### Изображение ищется «слева и ближе всех»

`extractFiguresFromFile` берёт **ближайшее** markdown-изображение, находящееся **до** `<figcaption>`:

```js
if (img.pos < pos && pos - img.pos < bestDist) { … }
```

Два изображения подряд и один `<figcaption>` — привяжется к ближайшему. `<figcaption>` без предшествующего изображения — `imagePath` = `null` (в таблицу попадёт `—`). Изображение **после** `<figcaption>` — не найдётся.

### Относительные пути только от директории `.md`

`imagePath` резолвится относительно `path.dirname(fig.sourcePath)`. `<img src>` от корня сайта (`/ru/foo/bar.png`) не резолвится — файл не найдётся, превью не создастся, но запись в каталоге будет с `—`.

`!/^(https?:|data:|\/\/)/i.test(raw)` не отсеивает `file://` и `ftp://` — такие записи попадут в `sharp()` и тихо упадут через `console.warn`.