---
title: Слой. CLI
sectionType: Page
context: 'layer, cli'
pureTitle: Слой. CLI
---


|               |                                                                               |
| ------------- | ----------------------------------------------------------------------------- |
| Идентификатор | `cli`                                                                         |
| Назначение    | Точка входа через терминал или CI                                             |
| Время работы  | Вне VS Code, по вызову из shell                                               |
| Состав        | `src/plugins/diplodoc-helper-cli.js`, `src/plugins/docs-build.js`, `build.js` |

{: .page-legend }

## Назначение

Слой `cli` — все способы дёрнуть модули **без VS Code**: из терминала вручную, из CI-пайплайна, из npm-скриптов. Ядро — три файла:

- `diplodoc-helper-cli.js` — «мультиинструмент»: подкоманды `helpMap`, `abbrs`, `terms`, `gosts`, `breadcrumb`, `contexttags`, `reindexFigures`, `footnoteAnchors`, `roadmap` и т.д.
- `docs-build.js` — оркестратор полного пайплайна (`pre` → `build` → `post`).
- `build.js` — esbuild-обёртка: собирает расширение в `dist/extension.js` (не про документацию, а про сам модуль расширения).

## Когда включается

- **Вручную** — `node ./plugins/diplodoc-helper-cli.js <команда> [--docsDir ...] [--outputDir ...]`.
- **Из `docs-build.js`** — встроенные шаги `pre`, `build`, `post`.
- **Из npm-скриптов** — `npm run build:prod` (`docs-build.js`), `npm run release:patch` и т.п.

## Состав

{% cut "Развернуть" %}

{% include [Cli](./modules.md) %}

{% endcut %}
