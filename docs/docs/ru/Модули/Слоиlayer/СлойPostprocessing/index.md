---
title: Слой. Post-processing
sectionType: Page
context: 'layer, post-processing, html'
pureTitle: Слой. Post-processing
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

{% cut "Развернуть" %}

{% include [Postprocessing](./modules.md) %}

{% endcut %}
