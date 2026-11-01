# docs-registry

Три скрипта, встроенные в `pre`-фазу `docs-build.js`.

## Порядок запуска (см. docs-build.js)

    node ./plugins/diplodoc-helper-cli.js catalog --lang=ru
    node ./plugins/diplodoc-helper-cli.js pageLegend --lang=ru --rewrite --with-include \
        --ignore=sectionType,context,pureTitle,ID_Group,ID_Type
    node ./plugins/diplodoc-helper-cli.js renderModules --lang=ru --rewrite --with-include

## Что делает каждый

- `catalog` — читает frontmatter всех `Модуль*/index.md`, строит `_generated/catalog.<lang>.json`.
- `pageLegend` — пишет `page-legend.md` в каждый модуль со ссылками на измерения;
  добавляет `{% include [legend](./page-legend.md) %}` в `index.md`.
- `renderModules` — пишет `modules.md` в каждую папку измерения; добавляет
  `{% include [modules](./modules.md) %}` в `index.md` измерения.

## Строгий режим

`catalog` и `pageLegend` **падают с exit 1**, если в модулях встречается `family`/`layer`/`capability`,
которого нет в `docs/_registry/dimensions.yaml`. Пользователь видит список недостающих
slug'ов и путь к реестру — это и есть «инструкция по исправлению».

Для отладки: `--lenient` (`catalog`) и `--skip-unknown` (`pageLegend`).

## Добавить новое измерение

1. Добавить блок в `dimensions.yaml` (по образцу `family`).
2. Создать папки `<slug>/index.md` рядом с существующими.
3. Запустить `pageLegend` + `renderModules`.
4. Скрипты ничего не хардкодят — новые измерения подхватятся.

## Что вне пула

- `fix-index-md.js` — разовый (переносит значения из таблицы во frontmatter).
- `bootstrap-registry.js` — разовый (генерирует `dimensions.yaml` skeleton).
- `validate-registry.js` — для ручной диагностики путей `dir`.
- `patch-metrics.js` — deprecated (`metrics.md` больше не создаётся).