---
title: Pre-processing
sectionType: Page
context: layer, pre-processing, markdown
---

|               |                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Идентификатор | `pre-processing`                                                                                                        |
| Назначение    | Правка `.md` в `docs/` до сборки                                                                                        |
| Время работы  | До слоя `build`                                                                                                         |
| Состав        | `reindexer`, `sections`, `contexts`, `helptags`, `abbrs`, `terms`, `gosts`, `figures`, `helpMap`, `roadmap` (генератор) |

{: .page-legend }

## Назначение

Слой `pre-processing` — всё, что правит исходники **до** `@diplodoc/cli`. Работает с файлами `docs/**/*.md` и `docs/**/*.yaml`, пишет туда же. Результат — структура, из которой `build` может собрать HTML без сюрпризов: пересчитанные индексы, актуальные `toc.yaml`, сгенерированные служебные страницы (списки аббревиатур, терминов, ГОСТов, контекстов).

Слой запускается **дважды** в двух разных контекстах:

- **при редактировании** — через команды VS Code (пользователь двигает раздел — пересчитываются индексы);
- **при сборке** — первая фаза `docs-build.js`, которая приводит всё в порядок перед `@diplodoc/cli`.

## Когда включается

- **VS Code** — отдельные команды: `diplodoc-helper.createSection`, `reindexDirectories`, `context.Update`, `abbr.Add` и т.д.
- **CLI** — фаза `pre` в `docs-build.js`: `reindexFigures`, `reindexFootnotes`, `helpMap`, `contexts`, `helptags`, `abbrs`, `terms`, `gosts`, `createFigureContent`, `roadmap`.

## Состав

- `reindexer` — пересчёт индексов, переименование папок, синхронизация `toc.yaml`.
- `sections` (функционально — `diplodoc.flow.js` + `yaml.*` + `md.index.*`) — создание/удаление/переименование разделов.
- `contexts` / `helptags` — генерация одноимённых служебных страниц.
- `abbrs` / `terms` / `gosts` — генераторы списков из соответствующих YAML-словарей.
- `figures` — список иллюстраций с превью.
- `helpMap` — `app-help-contents.json`.
- `roadmap` — **только** генератор `index.md` с диаграммой (клиентский патчер — уже `post-processing`).