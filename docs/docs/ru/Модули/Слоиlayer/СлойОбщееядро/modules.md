
| ID  | Модуль            | Что                                                                                                     |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| —   | `utils/*`         | `path.directory`, `frontmatter.utils`, `yaml.*`, `md.index.*`, `encoding.slugify`, `walk`, `html.utils` |
| —   | `model/*`         | `frontmatter.model`, `section.model`, `frontmatter.templates`                                           |
| —   | `shared/parser/*` | `mdLinks`                                                                                               |

Отдельных статей **нет** (это «библиотека», не модули). Но их функции упоминаются в «Связях» каждой статьи, которая их использует.


### Примечание


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
