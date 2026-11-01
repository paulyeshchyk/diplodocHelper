---
title: Модуль. Рендерер модулей
sectionType: Page
pureTitle: Рендерер модулей
context: modules, catalog, pre-processing, markdown-table
capability: reestr
family: fam-docs-registry
layer: pre-processing
ID: 56
ID_Group: 8
ID_Type: 2
Идентификатор: 'renderModules'
designation: 'Генерирует modules.md в каждой папке измерения — таблица модулей с колонками из реестра'
folder: 'plugins/docs-registry/render-modules/index.js'
entrypoint: 'runRenderModules(argv)'
role: 'Генератор'
version: '1.0.0'
---

{% include [legend](./page-legend.md) %}

## Назначение

`render-modules` — **прямое** направление связи. Для каждой папки измерения (`СемействоСноски`, `СлойBuild`, `КаталогКонтент` и т.д.) он пишет `modules.md` — таблицу всех модулей этого измерения. Плюс идемпотентно вставляет `{% include [modules](./modules.md) %}` в `index.md` измерения.

Если `build-page-legend` — это «от модуля к его измерениям», то `render-modules` — «от измерения к его модулям». Вместе они дают **двустороннюю связность** без ручной синхронизации.

## Применение

**Когда использовать:** в `pre`-фазе после `catalog`. Обязательно — если менялись `dimensions.yaml`, `columns` в реестре или `catalog.json`.

**Когда НЕ использовать:** в обход `catalog` — `render-modules` не ходит по ФС, только читает `catalog.json`. Если каталог устарел — таблицы устареют тоже.

**Альтернативы:** нет.

**Типичный сценарий:**
```
docs-build.js (pre) → catalog → pageLegend → renderModules --rewrite --with-include
```

## Как это работает

### Фаза 1. Загрузка каталога

`catalog.<lang>.json`. Проверяется только `dimensions` и `index` — `modules` не используется напрямую.

### Фаза 2. Для каждого измерения × slug

`catalog.dimensions[dim].items[slug]` даёт `{dir, title}`, `catalog.index[dim][slug]` — массив путей модулей (`Реестр/МодульX`).

### Фаза 3. Проверка папки

`fs.access(docsRoot + item.dir)`. Если папки нет — `error` (не `throw`, а счётчик `errors`). Причина: реестр может опережать ФС при первом прогоне, но после ручной синхронизации пропадает.

### Фаза 4. Рендер таблицы

Колонки — из `catalog.dimensions[dim].columns` (не хардкод в скрипте!). Тип ячейки — из `field`:

- `id` → **ссылка** на `index.md` модуля (`path.posix.relative(targetDirRel, mod.path)` + `encodeURI`), с опциональным `--anchor`;
- `ident` → **`code`** (`` `cli` ``);
- всё остальное → **plain text** (с экранированием `|` и `\n`);
- `fallback` — если `field` пуст, берётся `fallback` (например, `role` → `designation`).

Ширины колонок — по максимуму содержимого, минимум 3. Пустой `modules.md` (шапка + нет строк) для пустых измерений — норма: `include` не падает.

### Фаза 5. Smart compare + запись

`--rewrite` → перезапись. Без — `unchanged` / `outdated` (с подсказкой). `--with-include` — `{% include [modules](./modules.md) %}` в `index.md` измерения (идемпотентно).

### Фаза 6. Итог

Счётчики `created / updated / unchanged / outdated / errors / totalModules`. `totalModules` — суммарное число строк в таблицах (для отчёта).

## Режимы работы

### CLI

| Опция | По умолчанию | Что |
|---|---|---|
| `--lang` | `ru` | язык |
| `--catalog` | `<docs>/_generated/catalog.<lang>.json` | источник |
| `--out-name` | `modules.md` | имя выходного файла |
| `--anchor` | — | якорь `#name` для ссылок на модули |
| `--rewrite` | — | перезапись при smart compare |
| `--with-include` | — | include в `index.md` измерения |
| `--dry-run` | — | не писать |
| `--verbose` | — | подробный вывод |

### Сборочный пайплайн

`docs-build.js → STEPS.pre[3]`:
```js
cli('renderModules', '--lang=ru', '--rewrite', '--with-include'),
```

CLI-команда `diplodoc-helper-cli.js renderModules …`.

## Связи

- **От `collect-catalog`** — читает `catalog.dimensions`, `catalog.index`. Без них не работает.
- **С `build-page-legend`** — параллельные потребители `catalog.json`, но пишут в разные места: `render-modules` — в измерениях, `build-page-legend` — в модулях.
- **С `index.md` измерения** — `--with-include` подключает `modules.md`.
- **С `columns` в реестре** — матрица колонок задаётся для каждого измерения (`family → designation`, `layer → role`, `capability → designation`). Меняется без правки кода.
