---
title: CLI
sectionType: Page
context: layer, cli
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

- `src/plugins/diplodoc-helper-cli.js` — диспетчер подкоманд; аргументы `--docsDir`, `--outputDir`, `--section`, `--targetHtml`.
- `src/plugins/docs-build.js` — фазы `pre`, `build`, `post`; флаги `--phase`, `--only`, `--skip`, `--list`, `--help`.
- `build.js` — сборка расширения (`NODE_ENV=production` → минификация, без sourcemap).
- `src/plugins/docs-build.cmd` — Windows-шим для `docs-build.js`.