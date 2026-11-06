---
title: Модуль. Сборщик каталога
sectionType: Page
pureTitle: Сборщик каталога
context: catalog, frontmatter, registry, pre-processing, yaml
capability: reestr
family: fam-docs-registry
layer: pre-processing
ID: 50
ID_Group: 8
ID_Type: 2
Идентификатор: 'collectCatalog'
designation: 'Собирает frontmatter всех модулей в catalog.json — единый источник правды для page-legend и modules.md'
folder: 'plugins/docs-registry/collect-catalog/index.js'
entrypoint: 'runCollectCatalog(argv)'
role: 'Индексер'
version: '1.0.0'
input:
output:
---

# README: collect-catalog

> Разработческая документация. Стиль — как у описаний модулей проекта.
> Frontmatter в конце файла (промоутится в реестр).

## Назначение

`collect-catalog` — **корень** всей цепочки `docs-registry`. Он читает
frontmatter всех папок-модулей, строит инвертированный индекс по измерениям
(в дефолтном проекте — `family`, `layer`, `capability`) и пишет
`_generated/catalog.<lang>.json` — единый источник правды для
`build-page-legend`, `render-modules` и `feature-map`.

Без него каждый потребитель ходил бы по ФС самостоятельно, а строгая
валидация slug'ов (есть ли `fam-illustrations` в `dimensions.yaml`?)
размазалась бы по трём-четырём скриптам.

`catalog.json` содержит:

- `modules` — все модули: `dir`, `path`, `id`, `ident`, `designation`,
  плюс все измерения (`families[]`, `layers[]`, `capabilities[]`, …);
- `dimensions` — копия реестра (колонки для `render-modules`,
  `dir`/`title` для ссылок в `build-page-legend`);
- `index` — `{dim: {slug: [modDir…]}}` — natural sort по `id` (fallback —
  `dir`);
- `warnings` — пустые измерения, отсутствующие папки, невалидный YAML;
- `registryPath` — путь к реестру (для сообщений об ошибках).

## Применение

**Когда использовать:** обязательно — первым шагом в `pre`-фазе
`docs-build.js`. Также — вручную после добавления/переименования модуля
или правки `dimensions.yaml`.

**Когда НЕ использовать:** никогда «в обход» — без `catalog.json` не
заработают ни `build-page-legend`, ни `render-modules`, ни `feature-map`.

**Альтернативы:** нет. Инвертированный индекс — единственный вход в
цепочку.

**Типичный сценарий:**

```
docs-build.js (pre) → catalog → pageLegend + renderModules + emitFeatureMap
                    → reindexFigures → …
```

## Как это работает

### Фаза 0. Подготовка путей

`_paths.ts` — единая точка правды для корня проекта. Порядок:

1. `process.env.DOCS_PROJECT_ROOT` — ставится в **prelude**
   `diplodoc-helper-cli.js` до первого `require('./_paths.ts')`:
   - из `--docs-project-root=<path>` (явный флаг);
   - иначе — `findProjectRoot(__dirname_cli)` (поиск вверх: `<X>/docs/docs/`
     → `PROJECT_ROOT = <X>/docs`; либо `<X>/docs/_registry` →
     `PROJECT_ROOT = <X>`).
2. Fallback — `process.cwd()`.

`_paths.ts` сам **не пытается** вычислить `__dirname` — под нативным Node
`.ts` грузится как ESM, где `__dirname` недоступен.

Опции `runCollectCatalog(argv, options)` переопределяют `_paths.ts`
**точечно**:

- `options.docsDir` — дефолт для `docsRoot` (вместо `DOCS_DIR`);
- `options.registryDir` — дефолт для fallback-кандидатов `resolveRegistryPath`;
- `options.generatedDir` — дефолт для `--out`.

Приоритет: `options.*` > `_paths.ts` (env или дефолт).

### Фаза 1. Реестр

`resolveRegistryPath(lang, explicit, registryDir)`:

1. `--registry=<path>` (если задан) — `path.resolve(explicit)`;
2. `<registryDir>/<lang>.yaml`;
3. `<registryDir>/dimensions.yaml`.

Первый существующий возвращается. Если ни один не найден — падает
`Error('Не удалось прочитать реестр: ENOENT…')` в Фазе 2.

Структура реестра: `{dimensions: {<dim>: {items: {<slug>: {dir, title}}}}}`.
Отсутствие `.dimensions` → `throw new Error('Реестр … не содержит .dimensions')`.

### Фаза 2. Обход модулей

`Fs_Find_Module_Dirs.findSync({ rootDir, prefix, skipDirNames })`:

- рекурсивно по `docsRoot` (`<docsDir>/<lang>/Модули` по умолчанию);
- пропускает по basename: `node_modules`, `.git`, `_generated`,
  `_includes`, `_registry`;
- модуль — папка, имя которой начинается с `prefix` (`--module-prefix`,
  по умолчанию `Модуль`) и в которой есть `index.md`;
- `skipHidden: false`, `skipUnderscore: false` — legacy-контракт
  (модули в `_`-папках возможны);
- проверка соответствия префиксу — `Fs_Find_Module_Dirs.matchModuleDir`:
  `Модуль` → `true`; `МодульCLI`, `Модуль CLI`, `Модуль_JSON`,
  `Модуль-X` → `true`; `Модульa`, `Модуль(a)` → `false`;
- pre-order обход, результат — массив абсолютных путей.

Если `foundDirs.length === 0` → `throw new Error('Ни одной папки "… *"
с index.md в …')` — пустой каталог не пишется.

### Фаза 3. Парсинг frontmatter

Для каждой папки-модуля:

1. `fs.readFile(path.join(dir, 'index.md'))` + strip BOM;
2. `Frontmatter_Split_Raw.split(content)` — raw-split (без парсинга YAML):
   `---\n…\n---\nbody`;
   - `null` при отсутствии frontmatter → `warnings.push`, `continue`;
   - `\r\n` / `\n` — обе поддерживаются;
   - пустой frontmatter `---\n---` — **`null`** (legacy-контракт; см.
     `CONTRIBUTING §5.3`).
3. `yaml.load(parts.frontmatter)` — парсинг. `|| {}` — legacy:
   `null`/`undefined` → `{}` без warning. Primitives (string/number/bool)
   и массивы → `warnings.push('frontmatter не объект')`, `continue`.
4. **Service fields** (общие для любого проекта, не измерения):
   - `mod.id` = `fm.id ?? ''`;
   - `mod.ident` = `fm.ident ?? ''`;
   - `mod.designation` = `fm.designation ?? ''`;
   - defaults — прямо из frontmatter; `_fields.yaml` может переопределить
     через `frontmatterKey` (см. Фаза 4).
5. **Измерения** — через `_fields.yaml`:
   - `loadFields(fieldsPath)` — манифест `{<key>: FieldDef}`;
   - `frontmatterKey || key` — откуда читать;
   - `kind: 'multi'` — `parseListValue(raw)` → `string[]`;
   - иначе — `raw != null ? String(raw) : ''`;
   - `dir` — `Path_ToPosix.convert(path.relative(docsRoot, dir))`;
   - `path` — `relDir + '/index.md'`.

`_fields.ts` кеширует манифест **по абсолютному `fieldsPath`**, а не по
`DOCS_DIR` — поэтому одна `runCollectCatalog` может обслуживать несколько
проектов в одном процессе (тесты, второй проект).

### Фаза 4. Строгая валидация slug

`dimToField: {dim: dimField}` — из `_fields.yaml` (только те поля, у
которых `f.dimension` задан).

Для каждого модуля и каждого измерения:

- `registry.dimensions[dim]` должен существовать;
- `mod[dimField]` — массив (multi) → каждый slug должен быть в
  `registry.dimensions[dim].items`;
- если не найден — `unknown.push({modDir, dim, slug})`.

Если `unknown.length > 0`:

- `--lenient` → `warnings.push` для каждого, продолжает;
- иначе → `printUnknownError(unknown, registryPath)` (группированный
  вывод в stderr) + `throw new Error('Ошибка валидации каталога: N
  неизвестных значений')`. CLI-entry ловит и делает `process.exit(1)`
  с `❌ …`.

### Фаза 5. Индекс + сорт

`index: {dim: {slug: [modDir…]}}`, инициализируется **всеми** slug'ами из
реестра (в том числе пустыми — они дадут warning).

Natural sort по `id`, fallback на `dir`:

```ts
index[dim][slug].sort((a, b) =>
    String_Compare_Natural.compare(modules[a]?.id || a, modules[b]?.id || b),
);
```

`String_Compare_Natural` сравнивает числовые сегменты как числа:
`'8.2-032'` < `'10.2-010'` (не лексикографически).

Дополнительно проверяется существование `dimensions.<dim>.items.<slug>.dir`:

- `fs.access(path.join(docsRoot, item.dir))` — если папки нет, warning;
- пустые измерения (`index[dim][slug].length === 0`) — warning.

### Фаза 6. Запись

`_generated/catalog.<lang>.json`, pretty-print (`JSON.stringify(catalog,
null, 2)`), `\n` в конце. `--dry-run` — не пишет, `--probe` — только
логирование до записи.

## Режимы работы

### CLI

| Опция             | По умолчанию                                    | Что                                  |
| ----------------- | ----------------------------------------------- | ------------------------------------ |
| `--lang`          | `ru`                                            | язык                                 |
| `--docs-root`     | `<docsDir>/<lang>/Модули`                       | корень модулей                       |
| `--registry`      | `<registryDir>/<lang>.yaml` → `dimensions.yaml` | реестр                               |
| `--out`           | `<generatedDir>/catalog.<lang>.json`            | выход                                |
| `--module-prefix` | `Модуль`                                        | префикс папки                        |
| `--lenient`       | —                                               | не падать на неизвестных slug        |
| `--probe`         | —                                               | показать найденное, ничего не писать |
| `--dry-run`       | —                                               | не писать catalog.json               |
| `--verbose`       | —                                               | все warnings                         |

**Глобальные флаги CLI** (обрабатываются в prelude `diplodoc-helper-cli.js`,
до `require('./_paths.ts')`):

| Флаг                         | Что                                                                        |
| ---------------------------- | -------------------------------------------------------------------------- |
| `--docs-project-root=<path>` | `PROJECT_ROOT` — пересчитывает `DOCS_DIR`, `GENERATED_DIR`, `REGISTRY_DIR` |
| `--docs-root=<docs-dir>`     | `opts.docsDir` — точечно, только `runCollectCatalog`                       |
| `--generated-dir=<gen-dir>`  | `opts.generatedDir` — точечно, только `runCollectCatalog`                  |

Приоритет: `--docs-project-root` > `opts.*` > `_paths.ts` дефолт.

### Сборочный пайплайн

`docs-build.js → STEPS.pre[1]`:

```js
cli('catalog', '--lang=ru'),
```

CLI-команда: `diplodoc-helper-cli.js catalog --lang=ru`.

### API `runCollectCatalog(argv, options)`

```ts
import { runCollectCatalog } from './index.ts';

await runCollectCatalog(
    ['--lang=ru', '--out=/abs/catalog.ru.json'],
    { docsDir, registryDir, generatedDir },
);
```

`options` — опциональны. `undefined` → `_paths.ts` дефолт.

**Важно:** функция **бросает `Error`**, а не вызывает `process.exit`.
`process.exit(1)` — только в CLI-entry (см. `CONTRIBUTING §4 Шаг 3.6`).
Это делает её тестируемой через `expect(...).rejects.toThrow(...)`.

## Связи

- **Вниз по цепочке**:
  - `build-page-legend` — `catalog.dimensions.<dim>.items[slug]` для
    ссылок в `page-legend.md`;
  - `render-modules` — `catalog.index` + `catalog.dimensions.<dim>.columns`;
  - `feature-map` — `catalog.modules` (для `data-attrs`) +
    `catalog.dimensions` + `catalog.index`;
  - `emit-modules-table` — `catalog.modules` + `catalog.dimensions`.
- **С `validate-registry`** — параллельная ручная утилита: проверяет
  только `dir` из реестра (существуют ли папки). `collect-catalog` тоже
  это проверяет (warning), но главная его роль — модули + индекс.
- **С `_registry/dimensions.yaml`** — источник всех slug'ов и `dir`.
  Новое измерение подхватывается без правки кода, если блок добавлен в
  реестр.
- **С `_registry/fields.yaml`** — манифест, какие frontmatter-поля в
  какие измерения каталога маппятся. Меняется без правки кода.

## Расширяемость для второго проекта

`collect-catalog` — **первый** в цепочке, кто готов к другому проекту
без правки кода:

| Что нужно                                             | Как                                                |
| ----------------------------------------------------- | -------------------------------------------------- |
| Другая папка документации (`guidelines/`, `manuals/`) | `--docs-root=<path>` или `options.docsDir`         |
| Другие измерения (`audience`, `topic`, `stage`)       | новый `_registry/fields.yaml` + `dimensions.yaml`  |
| Другие префиксы модулей (`Phone_`, `Model_`)          | `--module-prefix=<prefix>`                         |
| Другие service fields (`ident` из `pureTitle`)        | `_fields.yaml: ident: {frontmatterKey: pureTitle}` |

Что **не** готово (вне scope `collect-catalog`, отдельные волны):

- `build-page-legend` / `render-modules` / `emit-modules-table` — ещё
  `.js`, но читают `catalog.json`, так что для второго проекта работают
  из коробки (пока не трогаем — их миграция в TS отдельной волной);
- `feature-map.client.js` — IIFE с `data-attrs`, работает для любого
  набора измерений без правок (FM-d — опционально, для бандла).

---

## Frontmatter

```yaml
---
title: Модуль. Сборщик каталога
sectionType: Page
pureTitle: Сборщик каталога
context: catalog, frontmatter, registry, pre-processing, yaml
capability: reestr
family: fam-docs-registry
layer: pre-processing
ID: 50
ID_Group: 8
ID_Type: 2
Идентификатор: 'collectCatalog'
designation: 'Собирает frontmatter всех модулей в catalog.json — единый источник правды для page-legend, modules.md и feature-map'
folder: 'plugins/docs-registry/collect-catalog/index.ts'
entrypoint: 'runCollectCatalog(argv, options)'
role: 'Индексер'
version: '1.1.0'
input:
output:
---
```

Что изменилось в frontmatter после миграции:

- `folder` — `index.js` → `index.ts`;
- `entrypoint` — добавлен `options` (back-compat: вызов без options
  работает);
- `version` — `1.0.0` → `1.1.0` (breaking: `runCollectCatalog` бросает
  `Error` вместо `process.exit`; снят хардкод `DOCS_DIR`; добавлены
  `options.docsDir` / `registryDir` / `generatedDir`).
```