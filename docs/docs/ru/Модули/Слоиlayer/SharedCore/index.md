---
title: Общее ядро
sectionType: Page
context: layer, shared-core
---

|               |                                                                             |
| ------------- | --------------------------------------------------------------------------- |
| Идентификатор | `shared-core`                                                               |
| Назначение    | Общие утилиты, модели, парсеры                                              |
| Время работы  | Вызывается из всех остальных слоёв                                          |
| Состав        | `src/plugins/utils/*`, `src/plugins/model/*`, `src/plugins/shared/parser/*` |

{: .page-legend }

## Назначение

Слой `shared-core` — «кирпичи», из которых собраны остальные слои. Собственной точки входа у него нет: он не запускается сам по себе, а импортируется модулями `pre-processing`, `post-processing`, `vscode-ui` и `cli`. Если в `shared-core` появляется код, знающий про конкретный модуль (breadcrumb, gosts) — это ошибка слоя, её надо лечить.

## Когда включается

- **Всегда**, когда что-то работает. Каждый модуль так или иначе опирается на `shared-core`.

## Состав

- `utils/path.directory.js` — определение «это раздел Diplodoc?», «это корень языка?», поиск `langDir`, очистка пустых папок.
- `utils/frontmatter.utils.js` — обёртка над `gray-matter`: `parse` / `stringify` / `get` / `update` / `remove`, `getTitleFromMetadata`.
- `utils/yaml.*` — работа с `toc.yaml` и `index.yaml`: загрузка, вставка/удаление/сортировка элементов, шаблоны.
- `utils/md.index.*` — чтение/запись `index.md` (frontmatter-поля `title`, `pureTitle`, `sectionType`, `sectionIndex`).
- `utils/encoding.slugify.js` + `transliterate.js` — слаги для id и ссылок (кириллица → латиница, `%` → `percent`, `&` → `and`).
- `utils/path.extract.js` — относительные пути, нормализация ключей.
- `utils/walk.js`, `utils/html.utils.js` — обход файлов и распознавание HTML.
- `utils/clipboard.image.js` — картинка из буфера (PowerShell / osascript / xclip).
- `model/frontmatter.model.js`, `model/section.model.js` — константы и типы разделов.
- `model/frontmatter.templates.js` — строковые шаблоны (`TEMPLATE_INDEX_MD` и т.п.).
- `shared/parser/md/mdLinks.js` — `isExternalLink`, `isRemoteOrDataUrl` (общие для линтера и `link.Paste`).