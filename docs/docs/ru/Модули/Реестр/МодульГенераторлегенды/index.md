---
title: Модуль. Генератор легенды
sectionType: Page
pureTitle: Генератор легенды
context: page-legend, frontmatter, catalog, pre-processing, yaml
capability: reestr
family: fam-docs-registry
layer: pre-processing
ID: 55
ID_Group: 8
ID_Type: 2
Идентификатор: 'buildPageLegend'
designation: 'Генерирует page-legend.md в каждом модуле со ссылками на измерения и вставляет include в index.md'
folder: 'plugins/docs-registry/build-page-legend/index.js'
entrypoint: 'runBuildPageLegend(argv)'
role: 'Генератор'
version: '1.0.0'
---

{% include [legend](./page-legend.md) %}

## Назначение

`build-page-legend` берёт `catalog.<lang>.json` и для каждого модуля пишет `page-legend.md` — снимок frontmatter + **ссылки** на измерения (`family`, `layer`, `capability`). Плюс идемпотентно вставляет `{% include [legend](./page-legend.md) %}` в `index.md` модуля.

Двойная роль `page-legend.md`:

1. **Снимок** — быстрая сверка с frontmatter глазами (без парсинга YAML).
2. **Навигация** — из модуля в один клик к его семействам/слоям/капабилити.

Без `--catalog` работает как **raw snapshot** (без ссылок) — сохраняется обратная совместимость с сессией первого скрипта.

## Применение

**Когда использовать:** в `pre`-фазе после `catalog`. Обязательно — если менялись frontmatter модулей, `dimensions.yaml` или `catalog.json`.

**Когда НЕ использовать:** в обход `catalog` — если в модулях появился новый slug, не зафиксированный в реестре, строгий режим (`--skip-unknown` по умолчанию выключен) выдаст ошибку.

**Альтернативы:**
- `--catalog` не указан — raw snapshot без ссылок (теряется навигация).
- `--skip-unknown` — рендерить неизвестные slug'и как `` `код` `` без ссылок (для отладки, не для продакшена).

**Типичный сценарий:**
```
docs-build.js (pre) → catalog → pageLegend --rewrite --with-include \
    --ignore=sectionType,context,pureTitle,ID_Group,ID_Type → renderModules
```

## Как это работает

### Фаза 1. Обход

Рекурсивно `docs/<lang>/Модули/Модуль*/index.md`. Пропускает те же служебные папки, что и `collect-catalog`.

### Фаза 2. Парсинг frontmatter

`js-yaml`, объект. Массивные поля (`family`, `layer`, `capability`) разбираются через `parseArrayValue` (YAML-массив или строка через запятую).

### Фаза 3. Форматирование значения

Три ветки по приоритету:

1. **Измерение + `catalog`** — каждая часть массива → `[slug](relative/path/to/index.md)`, склейка через `PROPERTY_JOIN[key]` (` / ` для `layer`, ` + ` для остальных). Если slug не найден — `formatDimensionLink` вернёт `null`, значение уходит в `ctx.unknowns`, в ячейку попадает `` `slug` `` (fallback при `--skip-unknown`).
2. **Массив без `catalog`** — элементы форматируются по `PROPERTY_FORMAT[key]` и склеиваются.
3. **Скаляр** — `formatScalar`: `plain` / `backtick` / `single` / `double` / `auto`. `stripExistingWrap` снимает существующую обёртку, чтобы избежать `\`\`a\`\`` (двойных бэктиков).

### Фаза 4. Сортировка

`--order=custom` (по `CUSTOM_ORDER`: `ID`, `Идентификатор`, `title`, …), `ascending` / `descending` по `localeCompare('ru')`, `none` — как в YAML.

### Фаза 5. Строгая проверка

Двухпроходная логика (важно):

- **Проход 1** — собрать все `unknowns` из всех файлов **без записи**.
- Если `unknowns.length > 0` и нет `--skip-unknown` — **exit 1** с группированным выводом (как `collect-catalog`).
- **Проход 2** — только если валидация прошла (или `--skip-unknown`), записать все файлы.

Это гарантирует: **никакая часть** проекта не будет записана «наполовину» при ошибке.

### Фаза 6. Smart compare + include

`--rewrite` → перезапись; без — `unchanged` / `outdated` (Q3=B). `--with-include` — добавляет `{% include [legend](./page-legend.md) %}` в `index.md` модуля (один раз, проверка по строке).

### Фаза 7. Артефакт

`page-legend.md` рядом с `index.md` модуля. Формат — markdown-таблица с `{: .page-legend }` в конце, первая строка — пустой заголовок (шапка без имени).

## Режимы работы

### CLI

| Опция | По умолчанию | Что |
|---|---|---|
| `--lang` | `ru` | язык |
| `--catalog` | `<docs>/_generated/catalog.<lang>.json` | источник |
| `--skip-unknown` | — | не падать на неизвестных slug |
| `--rewrite` | — | перезапись при smart compare |
| `--with-include` | — | include в `index.md` |
| `--order` | `custom` | порядок свойств |
| `--ignore` | — | свойства через запятую |
| `--dry-run` | — | не писать |
| `--verbose` | — | детальный вывод |

### Сборочный пайплайн

`docs-build.js → STEPS.pre[2]`:
```js
cli('pageLegend', '--lang=ru', '--rewrite', '--with-include',
    '--ignore=sectionType,context,pureTitle,ID_Group,ID_Type'),
```

CLI-команда `diplodoc-helper-cli.js pageLegend …`.

## Связи

- **От `collect-catalog`** — читает `catalog.<lang>.json`. Без него — raw snapshot.
- **С `render-modules`** — оба читают `catalog.json`, но идут параллельно: `page-legend` пишет в модулях, `render-modules` — в измерениях.
- **С `index.md` модуля** — `--with-include` добавляет include. Без него `page-legend.md` — просто файл рядом, не подключённый.
- **С `--ignore`** — если свойство не нужно читателю (служебное — `sectionType`, `ID_Group`), исключается. Влияет и на сравнение (`--rewrite` не заметит изменений в игнорируемых полях).

