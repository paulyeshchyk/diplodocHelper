---
title: Post-processing
sectionType: Page
context: layer, post-processing, html
---

|               |                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Идентификатор | `post-processing`                                                                                                                                                                         |
| Назначение    | Правка `.html` в `build/` после сборки                                                                                                                                                    |
| Время работы  | После слоя `build`                                                                                                                                                                        |
| Состав        | `breadcrumb`, `context-tags`, `tocCleanMode`, `footnoteAnchors`, `footnoteNumbering`, `abbrs` (injector), `terms` (injector), `gosts` (injector), `contentNavigator`, `roadmap` (patcher) |

{: .page-legend }

## Назначение

Слой `post-processing` — финальная правка готовых HTML-страниц. Ничего не пересобирает, только вставляет недостающее: клиентские скрипты, навигацию, якоря, вспомогательные страницы-отчёты. Всё, что делает `post-processing`, можно описать как «добавить в `build/*.html` то, что `@diplodoc/cli` не умеет».

Ключевая особенность слоя — **идемпотентность**: повторный запуск не должен ломать уже вставленное. Поэтому каждый инжектор проверяет маркеры (`id="dl-abbr-occ-client"`, `id="footnotes-container"`, `class="gosts-container"` и т.п.) перед вставкой.

## Когда включается

- **VS Code** — команды: `generateBreadcrumbs`, `generateAbbrs`/`generateTerms` (inject-фаза), `reindexFigures` (обновляет html-ссылки), `generateContextmap`.
- **CLI** — фаза `post` в `docs-build.js`: длинная цепочка шагов от `footnoteAnchors` до `periodicTableContext`.

## Состав

- `breadcrumb` — навигационная цепочка на каждой странице.
- `context-tags` — теги контекстов в конце статьи.
- `tocCleanMode` — режим «без боковой навигации» (для встраивания через `?clean=1`).
- `footnoteAnchors` — абсолютные ссылки на сноски (фикс Diplodoc).
- `footnoteNumbering` — сквозная нумерация сносок по `toc.yaml`.
- `abbrs` (injector) / `terms` (injector) — тултипы на `<abbr>`-разметку.
- `gosts` (injector) — таблица ГОСТов на странице `Справочник`.
- `contentNavigator` — таблицы-отчёты (периодическая, размеры, контексты, helptags, сноски, статистика).
- `roadmap` (patcher) — клиентские pan/zoom для диаграммы Ганта.