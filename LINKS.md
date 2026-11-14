# Матрицы вставки ссылок (после фиксов)

## Матрица 1 — Формат ссылки (`[..](..)` vs HTML-тег)

Определяется **только** `document.languageId` (Fix D: `checkIsInsideHtml` больше не участвует).

| #   | Файл (`languageId`) | Что вставляется     | Пример                             |
| --- | ------------------- | ------------------- | ---------------------------------- |
| 1   | `markdown`          | Markdown            | `[Title](./foo.md)`                |
| 2   | `yaml`              | HTML                | `<a href="/ru/foo.html">Title</a>` |
| 3   | любое другое        | Markdown (fallback) | `[Title](./foo.md)`                |

Колонки «было»/«стало» — потому что раньше `isHtml` зависел ещё и от позиции курсора (`checkIsInsideHtml`), что давало ложные срабатывания (незакрытый `<div>`, `<tag>` внутри HTML-комментария). После Fix D — только язык файла.

## Матрица 2 — Тип пути (relative vs absolute)

| #   | Формат   | Метод                           | База                                              | Результат                                              |
| --- | -------- | ------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| 1   | Markdown | `Link_Build_Path.buildRelative` | от директории текущего файла                      | `./foo.md`, `./folder/index.md`, `../bar.md`           |
| 2   | HTML     | `Link_Build_Path.buildAbsolute` | от `workspaceRoot`, с отрезанием `<docsDirName>/` | `/ru/foo.html`, `/ru/folder/index.html`, `/ru/img.png` |

Fix B: HTML-путь **всегда** с ведущим `/` (абсолютный от корня сайта). До фикса был `ru/foo.html` без `/` — браузер резолвил относительно текущей страницы и получал битый URL `/ru/ТекущаяСтраница/ru/foo.html`.

Fix docsDirName: имя папки документации вынесено в настройку `diplodoc-helper.docsFolderName` (default `docs`). Для проекта с `documents/` или `Статьи/` — переопределяется в `settings.json`.

## Матрица 3 — Что техпис получает после вставки (сводная)

Определение типа цели — `fs.stat` + расширение (Fix A: `.md` — документ, не картинка).

| #   | Что скопировано                                      | В `.md` (Markdown-режим)                                                             | В `.yaml` (HTML-режим)                      |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | Папка в `<docsDirName>/`                             | `[Title](./folder/index.md)`                                                         | `<a href="/ru/folder/index.html">Title</a>` |
| 2   | `.md` файл в `<docsDirName>/`                        | `[Title](./foo.md)`                                                                  | `<a href="/ru/foo.html">Title</a>`          |
| 3   | `index.md` в `<docsDirName>/<dir>/`                  | `[Title](./<dir>/index.md)`                                                          | `<a href="/ru/<dir>/index.html">Title</a>`  |
| 4   | Картинка (`.png` / `.jpg` / `.svg` / …)              | `<figure>` + `![](./img.png)` + `<figcaption>` (Diplodoc-стандарт, `buildImageLink`) | `<img src="/ru/img.png" alt="…">`           |
| 5   | Файл вне `<docsDirName>/`, но внутри `workspaceRoot` | ⚠️ warning «вне `<docsDirName>/`», **ничего не вставляется**                          | ⚠️ warning, ничего не вставляется            |
| 6   | Файл вне `workspaceRoot`                             | ⚠️ warning, ничего не вставляется                                                     | ⚠️ warning, ничего не вставляется            |

Строки 5–6 — `Link_Build_Path.assertInsideDocs` (единая проверка до выбора format). Diplodoc собирает только `<docsDirName>/`; ссылка на `src/foo.md` дала бы гарантированный 404 после `build/`. Лучше отказать с сообщением, чем молча вставить битую ссылку.

Диаграмма потоков для строк 5–6:

```
copyLink (clipboard JSON)
  └─ Paste: workspaceRoot есть?
       ├─ нет  → warning, return null
       └─ да   → assertInsideDocs(workspaceRoot, target, docsDirName)
                  ├─ throw → warning, return null
                  └─ ok    → buildRelative | buildAbsolute → Link_Format_Markdown.format
```

## Матрица 4 — Что видит техпис в диалоге выбора якоря

`Link_Read_Anchors.extract` (используется и в `Paste`, и в `linter.links` «исправить битую ссылку»). Порядок приоритета: заголовки → inline-элементы с `id` → bare `id` → legacy `<a name>`.

| #   | Разметка в source `.md`                       | label в диалоге            | anchor                      |
| --- | --------------------------------------------- | -------------------------- | --------------------------- |
| 1   | `<strong id="term-valyuta">Валюта</strong>`   | `Валюта`                   | `term-valyuta`              |
| 2   | `<strong id="abbr-api">API</strong>`          | `API`                      | `abbr-api`                  |
| 3   | `<abbr id="term-api"><em>API v2</em></abbr>`  | `API v2` (inner HTML снят) | `term-api`                  |
| 4   | `<div id="container">…</div>` (не inline-тег) | `id: container` (fallback) | `container`                 |
| 5   | `## А {#letter-b}`                            | `## А`                     | `letter-b`                  |
| 6   | `## Список терминов` (без явного id)          | `## Список терминов`       | `spisok-terminov` (slugify) |
| 7   | `<a name="old-anchor"></a>` (legacy)          | `name: old-anchor`         | `old-anchor`                |

Дедупликация по anchor — первое вхождение выигрывает. Если `<strong id="x">…</strong>` и ниже `<div id="x">` — в списке только `Валюта` (не «id: x»).

Inline-теги, для которых извлекается видимый текст: `strong`, `abbr`, `span`, `b`, `i`, `em`, `code`. Для остальных (например, `<div>`) — fallback `id: X`.