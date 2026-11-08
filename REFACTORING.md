# Plan: Plugin unification + init-config CLI

Документ фиксирует намерения и контракт между командами до начала
реализации. После согласования становится спецификацией Wave 1.

---

## 0. Контекст и цель

### 0.1. Боль

- `docs-build.js` — 30+ hardcoded шагов, каждый со своим `args`.
  Изменение одного шага — правка JS. Нет декларации «этот модуль включён
  в этом проекте, а этот — нет».
- `diplodoc-helper-cli.js` — 27 команд через `else if`, eager-require
  30+ модулей в шапке, `--help` не обрабатывается, аргументы
  парсятся ad-hoc в каждом блоке.
- Нет способа «отключить ГОСТы в MES, не отключая known-issues в
  diplodoc-helper» без правки общего `docs-build.js`.
- `.vscode/tasks.json` (см. `readme_images/tasks_*.json`) — UI для
  администратора проекта; но он hardcoded, копируется через
  `installScripts`, и не отражает реальную конфигурацию модулей.

### 0.2. Цель

- **Единая декларация:** каждый модуль объявляет метаданные (имя,
  описание, фаза, default-order, аргументы) через `ModuleDef`.
- **Пользовательский конфиг** `<project-root>/plugins.config.yaml`:
  - какие модули включены (`enabled`),
  - в каком порядке (массив = порядок),
  - с какими опциями.
- **Lazy loading:** CLI грузит только запрошенный модуль.
- **`init-config`:** скаффолд `plugins.config.yaml` + сопровождающих
  (`layout.json` / `_fields.yaml` / `feature-map.config.json` / …)
  из анализа структуры проекта.
- **`--help`** — минимальный, без per-option-детализации (см. §2.8).

### 0.3. Не входит в scope

- Полная миграция всех 27 модулей (Wave 5 — инкрементальная).
- UI для администратора (вне scope; `.vscode/tasks.json` — legacy,
  не трогаем).
- Пересмотр `docs-build.js` (legacy сохраняется, см. §4).
- Удаление `docs-build.js` (после Wave 5+, отдельная волна).

---

## 1. Инвентаризация

### 1.1. `diplodoc-helper-cli.js` — что не так

- 30+ eager `require` в шапке → старт = полная загрузка.
- 27 `else if` для команд → парсинг args размазан.
- `--help` не обрабатывается (уходит в `else if` → silent no-op).
- `module.exports` = 15+ eager-функций (для тестов; после Wave 2
  станет ненужным).
- Два способа передать путь: `--docs-project-root` (env, prelude) vs
  `--docs-root` / `--generated-dir` (opts, точечно). Не унифицировано.

### 1.2. `docs-build.js` — что не так

- 3 фазы × 10+ шагов, каждый hardcoded.
- Шаг = `cli(name, ...args)` / `node(...)` / `npx(...)` / `run(name, fn)`.
- Нет декларации «этот проект не использует ГОСТы» — правка JS.
- `--phase` / `--only` / `--skip` — есть, но не заменяют конфиг.

### 1.3. Что общего у аргументов

~9 Common (`--lang`, `--docs-project-root`, `--docs-dir`,
`--generated-dir`, `--build-dir`, `--out-dir`, `--verbose`, `--dry-run`,
`--help`). Специфичных — 0-6, кроме `jsonToMd` (14).

Плоская структура options в `plugins.config.yaml` — приемлема.

---

## 2. Архитектурные решения

### 2.1. Config location: `<project-root>/plugins.config.{yaml,yml,json}`

**Правило:** конфиг лежит **рядом с `package.json`** проекта.

Структура проекта (MES, docs-wrapper, extension source):

```
root/
├── .vscode/           ← настройки разработчика
├── build/             ← сборка
├── docs/              ← вотчина техписа
├── plugins/           ← runtime-скрипты (installScripts)
├── package.json
└── plugins.config.yaml   ← здесь
```

Для nested-проекта (docs-wrapper в extension):
```
<repo>/docs/
├── plugins/
├── docs/              ← вотчина техписа (внутри)
├── package.json
└── plugins.config.yaml
```

**Резолюция `plugins.config.yaml`** — отдельный resolver
`findConfigRoot(startDir)`: walk up until first `package.json`.

Для `<repo>/src/plugins/` (dev extension) → `<repo>/plugins.config.yaml`.
Для `<repo>/docs/plugins/` (docs-wrapper) → `<repo>/docs/plugins.config.yaml`.
Для `<mes>/plugins/` → `<mes>/plugins.config.yaml`.

**Это независимо от `_paths.PROJECT_ROOT`.** Два резолвера:

| Резолвер                        | Что                                                | Правило                                                            |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `_paths.PROJECT_ROOT`           | технический (`docs/`, `_generated/`, `_registry/`) | существующий (`docs/docs/` → `<X>/docs`; `docs/_registry` → `<X>`) |
| `findConfigRoot(__dirname_cli)` | пользовательский конфиг                            | walk up to first `package.json`                                    |

Для MES оба = `<mes>/`. Для docs-wrapper оба = `<repo>/docs/`. Для dev
extension source: `_paths` = `<repo>/docs/` (технически верно),
config = `<repo>/` (пользовательски верно).

### 2.2. Формат конфига — YAML (default), JSON (fallback)

Приоритет загрузки: `plugins.config.yaml` → `plugins.config.yml` →
`plugins.config.json`.

**YAML:** комментарии (`# disabled: MES не использует ГОСТы`) —
критичны для проектных решений. JSON — для программной генерации.

### 2.3. Module metadata — `ModuleDef`

```typescript
// src/plugins/cli/types.ts

export interface ArgSpec {
    name: string;                   // 'anchor'
    flag: string;                   // '--anchor'
    type: 'string' | 'boolean' | 'number';
    description: string;
    default?: string | number | boolean;
    required?: boolean;
}

export interface ModuleDef {
    /** Уникальное имя команды: 'collectCatalog'. */
    name: string;
    /** Короткое описание. */
    description: string;
    /** Фаза в pipeline. Строго одна. */
    phase: 'pre' | 'build' | 'post';
    /** Suggestion для init-config. */
    defaultOrder: number;
    /** Зависимости (для init-config validation; не runtime). */
    dependsOn?: string[];
    /** Специфичные аргументы (Common — автоматически). */
    args: ArgSpec[];
    /** Lazy loading. */
    load(): Promise<ModuleImpl>;
}

export interface ModuleImpl {
    run(opts: Record<string, unknown>): Promise<void>;
}
```

Каждый модуль экспортирует `const xxxModule: ModuleDef` из
`<path>/<name>.module.ts`:

```typescript
export const collectCatalogModule: ModuleDef = {
    name: 'collectCatalog',
    description: 'Собирает frontmatter всех модулей в catalog.json',
    phase: 'pre',
    defaultOrder: 10,
    args: [
        { name: 'modulePrefix', flag: '--module-prefix', type: 'string', description: '...' },
        { name: 'lenient',      flag: '--lenient',       type: 'boolean', description: '...' },
        { name: 'probe',        flag: '--probe',         type: 'boolean', description: '...' },
    ],
    async load() {
        const mod = await import('./index.ts');
        return { run: (opts) => mod.runCollectCatalog(toArgv(opts), toOptions(opts)) };
    },
};
```

### 2.4. Phase и порядок внутри фазы — ответ на Q2

**Plugin declares `phase`** (одно значение) и **`defaultOrder`**
(число). `defaultOrder` — только suggestion для `init-config`.

**Пользователь может задать произвольный порядок** через порядок
элементов в `plugins.config.yaml`. Рантайм использует **буквальный
порядок массива**.

Пример: если `reindexFigures` должен идти после `reindexFootnotes`
(вопреки `defaultOrder`), пользователь меняет две строки местами:

```yaml
pre:
  - module: collectCatalog
  - module: reindexFootnotes      # ← явно переставлено
  - module: reindexFigures
  - module: emitFeatureMap
```

**Arbitrary order — достижим.** Никакого topo-sort в рантайме.

`dependsOn` — только для `init-config` validation (warn: «вы включили
`emitFeatureMap`, но выключили `collectCatalog` — FM не сможет
прочитать каталог»). Рантайм не падает на отсутствующей зависимости.

**Phase override** — не поддерживаем. Если модулю нужно быть в двух
фазах — это два модуля (`xxxPre` / `xxxPost`). Одна фаза на модуль —
простая ментальная модель.

### 2.5. `plugins.config.yaml` — структура

```yaml
# plugins.config.yaml
# Проект: MES

lang: ru

common:
  verbose: false
  dryRun: false

stages:
  pre:
    - module: collectCatalog
    - module: buildPageLegend
      options: { rewrite: true, withInclude: true }
    - module: renderModules
      options: { rewrite: true, withInclude: true }
    - module: emitModulesTable
      options: { anchor: naznachenie }
    - module: emitFeatureMap
    - module: reindexFigures
    - module: reindexFootnotes
    - module: helpMap
    - module: contexts
    - module: helptags
    - module: abbrs
    - module: terms
    - module: gosts
      enabled: false             # MES не использует ГОСТы
    - module: roadMap
      enabled: false
    - module: jsonToMd
      enabled: false

  build:
    - module: diplodocBuild
      options: { quiet: true }

  post:
    - module: featureMapInject
    - module: footnoteAnchors
    - module: abbrTitles
    - module: termTitles
    - module: footnoteNumbering
    - module: footnoteList
      options: { section: Переченьсносок }
    - module: gostsInject
      enabled: false
    - module: breadcrumb
    - module: contexttags
    - module: comments
      enabled: false
    - module: ganttFixScroll
      enabled: false
```

**Резервные ключи** в каждом entry: `module`, `enabled`, `options`.
Всё остальное — **не** резервируется (можно писать флаги flat, если
удобнее — `enabled` не конфликтует с `rewrite`):

```yaml
pre:
  - module: buildPageLegend
    rewrite: true
    withInclude: true
```

Оба варианта валидны. Рекомендуемый — flat, для читаемости.

**Семантика `enabled`:**

| `pipeline.yaml`                | `enabled`   | Поведение                                                        |
| ------------------------------ | ----------- | ---------------------------------------------------------------- |
| файла нет                      | —           | `DEFAULT_PIPELINE` (back-compat: как `docs-build.js` сейчас)     |
| файл есть, module отсутствует  | —           | не запускается                                                   |
| файл есть, module присутствует | отсутствует | **запускается** (default `true`)                                 |
| файл есть, module присутствует | `false`     | явно отключён (для документации + `init-config` идемпотентности) |
| файл есть, module присутствует | `true`      | запускается                                                      |

### 2.6. `DEFAULT_PIPELINE` и fallback

Без `plugins.config.yaml` — `DEFAULT_PIPELINE` внутри
`pipeline.constants.ts`, точно отражает текущий `docs-build.js`.
Back-compat 100%.

`init-config` **всегда** создаёт полный `plugins.config.yaml` (все
модули с явным `enabled: true|false`), чтобы дальнейшие прогоны были
детерминированными.

### 2.7. `init-config` — поведение (ответ на Q6 = C)

```bash
diplodoc-helper-cli init-config [--project-root=<path>] [--dry-run] [--force]
```

**Алгоритм:**

1. `findConfigRoot` → если не найден — error («не удалось найти корень
   проекта: нет package.json»).
2. Inspect `<project-root>/docs/`:
   - наличие `docs/<lang>/` → определить `lang` (по наличию папки
     `ru` / `en`);
   - наличие `docs/_registry/layout.json` → учитывать существующие
     `modulesFolder` / `modulePrefix`;
   - наличие `docs/_registry/dimensions.yaml` или
     `docs/_registry/<lang>.yaml` → `collectCatalog` + `renderModules`
     + `emitModulesTable` + `emitFeatureMap` включены;
   - наличие `docs/<lang>/Дополнительнаяинформация/ГОСТы/` →
     `gosts` включён; иначе выключен;
   - наличие `known-issues-summary.json` в любом модуле →
     `jsonToMd` включён; иначе выключен;
   - наличие `docs/<lang>/Дополнительнаяинформация/Переченьсносок/`
     → `footnoteList` включён.
3. Скаффолд `plugins.config.yaml`:
   - все `ModuleDef` из `registry.list()` сортируются по
     `(phase, defaultOrder)`;
   - каждый entry: `{ module: name }`, плюс `enabled: false` если
     heuristic отрицательный;
   - `common: { lang, verbose: false, dryRun: false }`.
4. Скаффолд `docs/_registry/layout.json` (если нет) — `modulesFolder`
   и `modulePrefix` по эвристикам.
5. Скаффолд `docs/_registry/_fields.yaml` (если нет) — service
   (`ident` / `designation`) + path-based (`section` / `audience`).
6. Скаффолд `docs/_registry/feature-map.config.json` (если нет) — по
   `_fields.yaml`: `stripDimensions` / `rowDimension` / `columnDimension`.
7. Скаффолд `docs/_registry/dimensions.yaml` (если нет) — только
   `module`, `content_type`, `status` (пустые items).

**Поведение при существующих файлах:**

- **default** (без флагов): не трогать существующие. Отчёт:
  ```
  + создан:    plugins.config.yaml
  + создан:    docs/_registry/layout.json
  - пропущен:  docs/_registry/feature-map.config.json (уже есть)
  ```
  `exit 0`.
- **`--dry-run`**: только отчёт, ничего не писать. `exit 0`.
- **`--force`**: перезаписать всё. `exit 0`.
- **`--only=plugins,layout`**: ограничить набор файлов (comma-separated).

**Не перезаписывает `dimensions.yaml`** без `--force`, потому что
там пользовательские измерения.

### 2.8. `--help` strategy — mixed mode (ответ на Q5)

**Минимум, без per-option детализации.** Три уровня:

**Уровень 1 — общая справка CLI:**

```
$ diplodoc-helper-cli --help

Diplodoc Helper CLI v1.58.0
Утилиты для работы с документацией Diplodoc.

Использование:
  diplodoc-helper-cli <command> [options]
  diplodoc-helper-cli run-pipeline [--stage=pre|build|post|all]
  diplodoc-helper-cli init-config [--dry-run] [--force]
  diplodoc-helper-cli --list [--yaml]
  diplodoc-helper-cli <command> --help

Глобальные флаги:
  --project-root=<path>   корень проекта (default: walk up to package.json)
  --lang=<code>           язык (default: 'ru')
  --help, -h              эта справка
  --list                  список всех модулей

Подробности: <command> --help, --list
```

**Уровень 2 — список модулей:**

```
$ diplodoc-helper-cli --list

Доступные модули (5 зарегистрировано, 22 legacy):

PRE:
  collectCatalog       Собирает frontmatter всех модулей в catalog.json
  buildPageLegend      Генерирует page-legend.md для модулей
  renderModules        Генерирует modules.md для измерений
  emitModulesTable     Строит modules-table.<lang>.json
  emitFeatureMap       Генерирует карту функционала

POST:
  (не зарегистрировано)

LEGACY (не зарегистрированы как ModuleDef):
  helpMap, contexts, helptags, abbrs, terms, gosts, roadMap, ...
```

`--list --yaml` — machine-readable, для скриптов / CI:

```yaml
modules:
  - name: collectCatalog
    phase: pre
    defaultOrder: 10
    description: Собирает frontmatter всех модулей в catalog.json
  - name: buildPageLegend
    phase: pre
    defaultOrder: 20
    ...
```

**Уровень 3 — справка по модулю (без детализации аргументов):**

```
$ diplodoc-helper-cli collectCatalog --help

collectCatalog
  Собирает frontmatter всех модулей в catalog.json

Фаза: pre
Зависимости: (нет)
Аргументы: --module-prefix --lenient --probe
Common:    --lang --docs-dir --generated-dir --registry-dir
           --verbose --dry-run

Пример:
  diplodoc-helper-cli collectCatalog --lang=ru
```

**Без per-option описания.** Если нужны детали — `--list --yaml`
(там `description` для каждого arg) или исходник модуля.

### 2.9. `--list --yaml` как snapshot метаданных

`diplodoc-helper-cli --list --yaml > plugins.metadata.yaml` — для
CI / внешних скриптов / будущего UI. Не генерируется автоматически
(пользователь решает, коммитить ли snapshot).

---

## 3. Waves

### Wave 1 — типы, парсер, реестр (2-3 дня, не трогаем реальные модули)

**Файлы:**

- `src/plugins/cli/types.ts` — `ArgSpec`, `ModuleDef`, `ModuleImpl`,
  `PipelineConfig`, `PipelineStage`.
- `src/plugins/cli/args.ts` — `parseArgs(argv, specs, commonSpecs): opts`.
  Единый парсер (`--key=value` / `--key value` / boolean flags).
- `src/plugins/cli/registry.ts` — `CommandRegistry`:
  - `register(def)`, `list()`, `get(name)`,
  - `run(name, argv, commonOpts)` (lazy `await def.load()` → `run(opts)`),
  - `listYaml()`.
- `src/plugins/cli/paths.ts` — `findConfigRoot(startDir)` (walk up to
  first `package.json`).

**Тесты (`00.7.1#01..#12`):**

- `parseArgs` — `--key=value` / `--key value` / boolean / unknown flag /
  number coercion / default values.
- `CommandRegistry` — register / get / list / listYaml / run (mock
  ModuleImpl) / duplicate name throws.
- `findConfigRoot` — tmpdir с package.json на разных уровнях.

**Не трогаем** `diplodoc-helper-cli.js`, `docs-build.js`.

### Wave 2 — 5 модулей MES (2-3 дня)

`ModuleDef` для: `collectCatalog`, `buildPageLegend`, `renderModules`,
`emitModulesTable`, `emitFeatureMap`.

Каждый:

- `<module>.module.ts` (ленивая загрузка `./index.ts`);
- `<module>.module.test.ts` (metadata + smoke-run через mock opts).

**`diplodoc-helper-cli.js`** — первые 5 `else if` меняются на
`registry.run(...)`. Остальные 22 — старый `else if`.

### Wave 3 — pipeline loader + runner (2-3 дня)

**Файлы:**

- `src/plugins/cli/pipeline.types.ts` — `PipelineConfig`, `PipelineStage`.
- `src/plugins/cli/pipeline.constants.ts` — `DEFAULT_PIPELINE` (точно
  как текущий `docs-build.js`).
- `src/plugins/cli/pipeline.loader.ts` — читает `plugins.config.{yaml,yml,json}`,
  мержит с `DEFAULT_PIPELINE` (если файла нет), валидирует schema.
- `src/plugins/cli/pipeline.runner.ts` — итерирует `stages[<phase>]`,
  для каждого entry `enabled !== false` → `registry.run(name, [], options)`.
- `src/plugins/cli/pipeline.cli.ts` — `runPipeline(argv)`.

**CLI-команда:**

```bash
diplodoc-helper-cli run-pipeline --stage=pre
diplodoc-helper-cli run-pipeline --stage=all
```

**`docs-build.js`** — не трогаем. **Новый** `plugins/run-pipeline.js`:

```javascript
require('./diplodoc-helper-cli.js').runPipeline(process.argv.slice(2));
```

**`package.json`:**

```json
"build:pipeline": "node ./plugins/run-pipeline.js --stage=all"
```

### Wave 4 — `init-config` (2-3 дня)

**Файлы:**

- `src/plugins/cli/init-config.ts` — CLI entry.
- `src/plugins/cli/init-config.inspector.ts` — эвристики.
- `src/plugins/cli/init-config.scaffolders/` — по одному на файл:
  - `pipeline.ts`
  - `layout.ts`
  - `fields.ts`
  - `feature-map-config.ts`
  - `dimensions.ts`

**Тесты (`00.7.4#01..#20`):**

- inspector — 5-6 сценариев (MES-like, diplodoc-helper-like, пустой
  проект, …).
- scaffold — каждый файл + `--dry-run` / `--force` / `--only`.
- integration — прогон в tmpdir, проверка структуры.

**CLI-команда:**

```bash
diplodoc-helper-cli init-config --project-root=<path> [--dry-run] [--force] [--only=...]
```

### Wave 5 — остальные 22 модуля (инкрементально, 1-2 недели)

По одному `ModuleDef` на модуль. После каждого — `diplodoc-helper-cli.js`
сокращается на 1 `else if`. Тесты по шаблону Wave 2.

### Wave 6 — CLI в TS (1 день)

После Wave 5 в `diplodoc-helper-cli.js` остаётся ~80 строк
(parse → find config → init / run-pipeline / --list / --help /
registry.run).

**Структура:**

- `src/plugins/diplodoc-helper-cli.js` — **тонкий CJS-bootstrap**:
  ```javascript
  require('./diplodoc-helper-cli-main.ts');
  ```
- `src/plugins/diplodoc-helper-cli-main.ts` — вся логика.

Почему bootstrap остаётся `.js`: entry point CLI вызывается через
`node ./plugins/diplodoc-helper-cli.js`. Точка входа не должна
зависеть от версии Node (в target-project может быть Node 20).

---

## 4. Fallback strategy (ответ на Q4)

**Оба доступны параллельно:**

| Файл                      | Команда                          | Что                                 |
| ------------------------- | -------------------------------- | ----------------------------------- |
| `plugins/docs-build.js`   | `node ./plugins/docs-build.js`   | legacy, 30+ hardcoded шагов         |
| `plugins/run-pipeline.js` | `node ./plugins/run-pipeline.js` | новый, читает `plugins.config.yaml` |

**`package.json`:**

```json
"build":          "node ./plugins/docs-build.js",
"build:pipeline": "node ./plugins/run-pipeline.js --stage=all"
```

**Оба работают одинаково**, пока `plugins.config.yaml` отсутствует
(`DEFAULT_PIPELINE` = legacy-шаги).

**Deprecation** — после Wave 5+, отдельной волной. Не в этом scope.

---

## 5. Acceptance criteria (для Wave 1..4)

**Wave 1:**

- `parseArgs` — все формы (`--k=v`, `--k v`, boolean), unknown flags
  → error.
- `CommandRegistry.register / get / list / listYaml / run` — 100%
  покрытие.
- `findConfigRoot` — 4 сценария (project root next to CLI, nested,
  dev extension, no package.json).
- Все тесты `00.7.1.*` зелёные.

**Wave 2:**

- 5 `ModuleDef` зарегистрированы.
- `diplodoc-helper-cli collectCatalog --lang=ru` (через registry) —
  результат идентичен старому `else if`.
- CLI-размер: было 30+ require в шапке, стало 25 (5 перенесены в
  `load()`).

**Wave 3:**

- `run-pipeline --stage=pre` без `plugins.config.yaml` — работает как
  legacy `docs-build.js --phase=pre`.
- С `plugins.config.yaml` (MES-like) — пропускает disabled модули.
- Порядок внутри фазы = порядок в YAML (проверка: переставить
  `reindexFootnotes` / `reindexFigures` — выполнится в новом порядке).

**Wave 4:**

- `init-config --dry-run` — отчёт без записи.
- `init-config` в новом проекте — создаёт 5 файлов + `plugins.config.yaml`.
- `init-config` в уже сконфигурированном — не трогает существующие.
- `init-config --force` — перезаписывает.

---

## 6. NOT in scope

- UI для администратора (вне scope этой волны; `.vscode/tasks.json` —
  legacy, не трогаем).
- Удаление `docs-build.js` (после Wave 5+).
- Полная миграция `jsonToMd` (23 опции; его структура — отдельная
  волна, вероятно с `options: { ... }`).
- Phase override (модуль не может быть в двух фазах — только как два
  разных `ModuleDef`).
- Runtime enforcement `dependsOn` (только validation в `init-config`).
- `plugins.metadata.yaml` — автогенерация snapshot из `--list --yaml`
  (пользователь запускает вручную).
- `.vscode/tasks.json` — обновление под новый pipeline (отдельная
  волна, если понадобится).

---

## 7. Открытые вопросы (закрыть до Wave 1)

1. **Резервное имя конфига** — `plugins.config.yaml` или
   `diplodoc-helper.config.yaml`? Мой голос — `plugins.config.yaml`
   (короче, project-agnostic, отражает «конфиг плагинов», а не
   конкретный тулинг).

2. **`--project-root` — имя флага** — `--project-root` или
   `--config-root`? Мой голос — `--project-root` (однозначно).

3. **`jsonToMd` в Wave 5** — принимаем flat (23 опции в `options`)?
   Или `options` — вложенный объект? Мой голос — flat для всех, кроме
   `jsonToMd`, где `options: { ... }` как escape hatch.

4. **`--list --yaml`** — генерировать в CI как артефакт или только
   on-demand? Мой голос — on-demand (не коммитим).

---

## 8. Оценка трудозатрат

| Wave      | Объём                       | Риск                                                 |
| --------- | --------------------------- | ---------------------------------------------------- |
| 1         | 2-3 дня                     | низкий (только новые файлы, старая логика нетронута) |
| 2         | 2-3 дня                     | низкий (5 модулей через shim + тесты)                |
| 3         | 2-3 дня                     | средний (pipeline loader + parallel fallback)        |
| 4         | 2-3 дня                     | средний (inspector эвристики)                        |
| 5         | 1-2 недели (инкрементально) | низкий (по одному модулю за раз)                     |
| 6         | 1 день                      | низкий (CLI в TS + bootstrap)                        |
| **Итого** | **~3 недели**               |                                                      |

---

## 9. Порядок ближайших действий

1. Обсудить §7 (4 вопроса) — 1 итерация.
2. **Wave 1** — 3 файла + 12 тестов. Отдельный коммит.
3. **Wave 2** — 5 модулей. Отдельный коммит.
4. **Wave 3** — pipeline. Отдельный коммит (с параллельным fallback).
5. **Wave 4** — `init-config`. Отдельный коммит.
6. Дальше — Wave 5 инкрементально.
7. Wave 6 — CLI в TS, финальный коммит.