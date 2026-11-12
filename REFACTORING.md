# Plan: Plugin unification + init-config CLI

Документ фиксирует контракт между командами до начала реализации.
После согласования (✅ 2026-11-12) становится спецификацией Wave 1.

---

## 0. Цель и контекст

### 0.1. Боль

- `docs-build.js` — 30+ hardcoded шагов, каждый со своим `args`.
  Изменение одного шага = правка JS. Нет декларации «этот модуль
  включён в этом проекте, а этот — нет».
- `diplodoc-helper-cli.js` — 27 команд через `else if`, eager-require
  30+ модулей в шапке, `--help` не обрабатывается, аргументы
  парсятся ad-hoc в каждом блоке.
- Нет способа «отключить ГОСТы в MES, не отключая known-issues в
  diplodoc-helper» без правки общего `docs-build.js`.

### 0.2. Цель

- **ModuleDef:** каждый модуль объявляет метаданные (имя, описание,
  фаза, defaultOrder, аргументы).
- **`plugins.config.yaml`** в корне проекта — какие модули включены,
  в каком порядке, с какими опциями.
- **Lazy loading:** CLI грузит только запрошенный модуль.
- **`init-config`:** скаффолд конфигов из анализа структуры.
- **`--help`** — минимальный (три уровня, без per-option).
- **Техпис vs CI:** `--config=<path>` для CI/Docker.

### 0.3. NOT in scope

- Полная миграция всех 27 модулей (Wave 5 — инкрементально).
- UI для администратора.
- Удаление `docs-build.js` (после Wave 5+).
- `logLevel` реально используется только в Wave 5+.
- `plugins.metadata.yaml` (автогенерация snapshot).

---

## 1. Инвентаризация

### 1.1. `diplodoc-helper-cli.js`

30+ eager require, 27 `else if`, `--help` silent no-op, `module.exports`
с 15+ eager-функциями.

### 1.2. `docs-build.js`

3 фазы × 10+ шагов, каждый hardcoded. Шаг = `cli(name, ...args)` /
`node(...)` / `npx(...)` / `run(name, fn)`. Нет декларации «этот
проект не использует ГОСТы».

### 1.3. Аргументы

~9 Common (`--lang`, `--docs-project-root`, `--docs-dir`,
`--generated-dir`, `--build-dir`, `--out-dir`, `--verbose`, `--dry-run`,
`--help`) + `logLevel`, `stopOnError`. Специфичных 0-6, кроме
`jsonToMd` (14).

Медиана = 11 опций. **Плоская структура** в yaml (без `options:`
для большинства). Для `jsonToMd` — `options: { ... }` как escape
hatch.

---

## 2. Архитектура

### 2.1. `plugins.config.yaml` — в корне проекта

Структура:

```
root/
├── .vscode/
├── build/
├── docs/                ← вотчина техписа
├── plugins/             ← runtime (installScripts)
├── package.json
└── plugins.config.yaml   ← здесь
```

**Резолюция** `--config`:
1. `--config=<path>` — явный флаг (абсолютный или cwd-relative);
2. `PLUGINS_CONFIG_PATH` env — shell-wrapper;
3. `<projectRoot>/plugins.config.yaml` — локально техпис;
4. `DEFAULT_PIPELINE` (код) — back-compat.

`--project-root=<path>` — флаг; если нет — walk up from `__dirname_cli`
до первого `package.json`.

**`diplodoc-helper-cli config --show`** — печатает effective config + источник.

### 2.2. Формат — YAML default, JSON fallback

Приоритет загрузки: `plugins.config.yaml` → `.yml` → `.json`.

**YAML** — комментарии, **JSON** — программная генерация.

### 2.3. `ModuleDef` — метаданные

```typescript
interface ArgSpec {
    name: string;                    // 'anchor' (camelCase, ключ в opts)
    flag: string;                    // '--anchor'
    type: 'string' | 'boolean' | 'number';
    description: string;             // для --list --yaml
    default?: string | number | boolean;
    required?: boolean;
}

interface ModuleDef {
    name: string;                    // 'collectCatalog' — уникально
    description: string;
    phase: 'pre' | 'build' | 'post';
    defaultOrder: number;            // suggestion для init-config
    dependsOn?: string[];            // для init-config validation
    args: ArgSpec[];                 // спец. аргументы
    load(): Promise<ModuleImpl>;     // lazy
}

interface ModuleImpl {
    run(opts: Record<string, unknown>): Promise<void>;
}
```

### 2.4. Phase и порядок

- `ModuleDef.phase` — одна фаза.
- `ModuleDef.defaultOrder` — только suggestion.
- **Порядок выполнения = порядок элементов в yaml**. Arbitrary order.

`dependsOn` — валидация в `init-config`, не в runtime.

### 2.5. `plugins.config.yaml` — структура

```yaml
lang: ru

common:
  logLevel: off              # L1
  stopOnError: true
  dryRun: false

stages:
  pre:
    - module: collectCatalog
    - module: buildPageLegend
      options: { rewrite: true, withInclude: true }   # L2
    - module: emitFeatureMap
      options: { logLevel: info }                     # L2 override L1
    - module: gosts
      enabled: false                                   # MES
  build:
    - module: diplodocBuild
  post:
    - module: featureMapInject
    - module: gostsInject
      enabled: false
```

**Резервные ключи:** `module`, `enabled`, `options`. Всё остальное —
специфичные флаги (flat допустимо, но рекомендуется `options`).

**Семантика `enabled`:**

| Файла нет          | module нет     | `enabled` нет | `enabled: true` | `enabled: false` |
| ------------------ | -------------- | ------------- | --------------- | ---------------- |
| `DEFAULT_PIPELINE` | не запускается | запускается   | запускается     | отключён         |

`DEFAULT_PIPELINE` = точно текущий `docs-build.js`. Back-compat 100%.

### 2.6. Merge опций — 4 уровня

```
effectiveOpts(module) =
  merge(
    L4: ModuleDef.args[].default,             // дефолт в коде (deprecated)
    L3: <plugin.config.*>,                    // свой конфиг плагина
    L1: <yaml>.common,                        // общий
    L2: <yaml>.stages.<phase>[].options       // для плагина
  )
```

**Приоритет:** **L2 > L1 > L3 > L4**.

Почему:

- (а) L2 > L3: в коде FM забыл выключить debug, но в yaml явно off —
  работает.
- (б) L1 > L3: для всех off, а в коде FM забыл выключить — L1
  перебивает L3.
- L4 — временный (deprecated), уйдёт в Wave 5.

`enabled` и `module` — резервные, не в opts.

### 2.7. L3 — конфиг плагина

Два места, оба опциональны:

1. `<projectRoot>/src/plugins/<name>/plugin.config.{yaml,yml,json}` — dev;
2. `<projectRoot>/plugins/<name>/plugin.config.{yaml,yml,json}` — runtime.

Приоритет: dev > runtime. Не используется для L1/L2.

### 2.8. `logLevel` и `stopOnError`

| Опция         | Значения                             | Default | Где    |
| ------------- | ------------------------------------ | ------- | ------ |
| `logLevel`    | `off` / `info` / `warning` / `error` | `off`   | L1-L4  |
| `stopOnError` | `true` / `false`                     | `true`  | L1, L2 |

**`stopOnError`** — свойство `pipeline.runner.ts`:

- `true` — прекратить stage при `throw`, `exit 1`;
- `false` — лог + `continue`, `exit 0` если все прошли.

**`logLevel`** — передаётся модулю через `opts.logLevel`. **На Wave 2
только данные** — `console.log` работает как раньше. Реальное
использование — Wave 5+ (`opts.logger`, `console.log` → `logger`).

`verbose` — **deprecated** (заменяется на `logLevel`), работает до
Wave 5.

### 2.9. `--help` — три уровня, без per-option

- `diplodoc-helper-cli --help` — глобальная справка + список команд.
- `diplodoc-helper-cli --list [--yaml]` — таблица `name | phase |
  description`.
- `diplodoc-helper-cli <module> --help` — `name` + `description` +
  `phase` + `args: [--flag1, --flag2]` + `dependsOn`.

Без описания каждого флага. Детали — `--list --yaml` или `<module>.module.ts`.

`--list --yaml` — on-demand, не комитим.

### 2.10. `init-config`

```bash
diplodoc-helper-cli init-config [--project-root=<path>] [--dry-run] [--force] [--only=<list>] [--config-path=<path>]
```

**Инспектор** (эвристики):

- `docs/<lang>/` → `lang`;
- `_registry/layout.json` → `modulesFolder` / `modulePrefix`;
- `_registry/{<lang>.yaml,dimensions.yaml}` → FM-модули включены;
- `docs/<lang>/Дополнительнаяинформация/ГОСТы/` → `gosts` включён;
- `known-issues-summary.json` → `jsonToMd` включён;
- `Переченьсносок/` → `footnoteList` включён;
- остальные — `enabled: false`.

**Поведение при существующих файлах:**

- default — не трогать существующие, отчёт, `exit 0`;
- `--dry-run` — отчёт без записи;
- `--force` — перезаписать всё;
- `--only=plugins,layout` — ограничить набор.

**Создаёт:**

1. `plugins.config.yaml` — все `ModuleDef`, сортировка `(phase, defaultOrder)`;
2. `docs/_registry/layout.json` — если нет;
3. `docs/_registry/_fields.yaml` — если нет;
4. `docs/_registry/feature-map.config.json` — если нет;
5. `docs/_registry/dimensions.yaml` — если нет (skeleton).

Не перезаписывает `dimensions.yaml` без `--force` (пользовательские данные).

### 2.11. Fallback strategy

Оба работают параллельно:

| Файл                      | Команда                          | Что                    |
| ------------------------- | -------------------------------- | ---------------------- |
| `plugins/docs-build.js`   | `node ./plugins/docs-build.js`   | legacy (30+ hardcoded) |
| `plugins/run-pipeline.js` | `node ./plugins/run-pipeline.js` | новый (yaml)           |

`package.json`:

```json
"build":          "node ./plugins/docs-build.js",
"build:pipeline": "node ./plugins/run-pipeline.js --stage=all"
```

Пока `plugins.config.yaml` нет — оба работают одинаково (`DEFAULT_PIPELINE`).
Deprecation `docs-build.js` — после Wave 5+.

---

## 3. Waves

### Wave 1 — типы, парсер, реестр, резолверы (2–3 дня)

Новые файлы (старая логика не трогается):

- `src/plugins/cli/types.ts` — `ArgSpec`, `ModuleDef`, `ModuleImpl`,
  `CommonOptions`, `PipelineConfig`, `PipelineStage`, `PipelineEntry`.
- `src/plugins/cli/args.ts` — `parseArgs(argv, specs, commonSpecs)`.
- `src/plugins/cli/registry.ts` — `CommandRegistry`.
- `src/plugins/cli/paths.ts` — `findProjectRoot`,
  `resolveConfigPath`, `resolvePluginConfigPath`.
- `src/plugins/cli/config.constants.ts` — `DEFAULT_COMMON_ARGS`.

Тесты `00.7.1#01..#15`:

- `args` (6): `--k=v` / `--k v` / boolean / unknown throws / number /
  `--help` handled;
- `registry` (5): register / duplicate throws / get / list / run;
- `paths` (4): `findProjectRoot` (nearby, nested, no package.json,
  start=root), `resolveConfigPath` (flag > env > default).

### Wave 2 — 5 модулей MES (2–3 дня)

`ModuleDef` для: `collectCatalog`, `buildPageLegend`, `renderModules`,
`emitModulesTable`, `emitFeatureMap`.

`<module>.module.ts` — `load()` через `await import('./index.ts')`,
`run(opts)`. Тесты `00.7.2#01..#10` (metadata + smoke-run через mock).

`diplodoc-helper-cli.js` — 5 `else if` → `registry.run(...)`.
Остальные 22 — старый `else if`.

**`logLevel` не используется** в Wave 2 (`console.log` как есть).

### Wave 3 — pipeline runner + merge (2–3 дня)

- `src/plugins/cli/pipeline.types.ts`;
- `src/plugins/cli/pipeline.constants.ts` — `DEFAULT_PIPELINE`;
- `src/plugins/cli/pipeline.loader.ts` — чтение + schema validation;
- `src/plugins/cli/pipeline.merge.ts` — L1/L2/L3/L4;
- `src/plugins/cli/pipeline.runner.ts` — итератор по stages, обработка
  `stopOnError`;
- `src/plugins/cli/pipeline.cli.ts` — `runPipeline(argv)`.

CLI: `run-pipeline --stage=pre|build|post|all`.

`plugins/run-pipeline.js` — тонкий bootstrap:
```javascript
require('./diplodoc-helper-cli.js').runPipeline(process.argv.slice(2));
```

Тесты `00.7.3#01..#18` (loader, merge, runner, stopOnError).

### Wave 4 — `init-config` (2–3 дня)

- `src/plugins/cli/init-config.ts` — CLI entry;
- `src/plugins/cli/init-config.inspector.ts` — эвристики;
- `src/plugins/cli/init-config.scaffolders/` — по файлу на конфиг.

Тесты `00.7.4#01..#20`.

### Wave 5 — остальные 22 модуля (1–2 недели, инкрементально)

По одному `ModuleDef`. Замена `console.log` → `opts.logger`. Удаление
`args[].default` (переход на L1/L2/L3). Тесты `00.7.5#*` по шаблону
Wave 2.

### Wave 6 — CLI в TypeScript (1 день)

`src/plugins/diplodoc-helper-cli.js` — тонкий CJS bootstrap:
```javascript
require('./diplodoc-helper-cli-main.ts');
```
`src/plugins/diplodoc-helper-cli-main.ts` — вся логика.

---

## 4. Fallback (детали)

`docs-build.js` — без изменений в Wave 1–6. `plugins.config.yaml` нет →
`DEFAULT_PIPELINE` = legacy. Оба `build` и `build:pipeline` работают
идентично.

---

## 5. Оценка

| Wave      | Объём           | Риск                       |
| --------- | --------------- | -------------------------- |
| 1         | 2–3 дня         | низкий (новые файлы)       |
| 2         | 2–3 дня         | низкий (5 модулей)         |
| 3         | 2–3 дня         | средний (pipeline + merge) |
| 4         | 2–3 дня         | средний (эвристики)        |
| 5         | 1–2 недели      | низкий (по одному)         |
| 6         | 1 день          | низкий                     |
| **Итого** | **~3.5 недели** |                            |

---

## 6. Acceptance criteria

**Wave 1:** `parseArgs` все формы; `CommandRegistry` register/get/list/run;
`findProjectRoot` 4 сценария; `resolveConfigPath` (flag/env/default/DEFAULT);
все тесты `00.7.1.*` зелёные; старые тесты (`141 suite / 665 passed`)
не сломаны.

**Wave 2:** 5 ModuleDef; `collectCatalog --lang=ru` через registry =
старый `else if`.

**Wave 3:** `run-pipeline --stage=pre` без yaml = legacy `docs-build.js
--phase=pre`. С yaml — пропуск disabled. Порядок = порядок yaml
(проверка: переставить `reindexFootnotes` / `reindexFigures`).
`stopOnError: false` — продолжает при throw.

**Wave 4:** `init-config --dry-run` — отчёт без записи; в новом проекте
создаёт 5 файлов; в уже сконфигурированном — не трогает; `--force`
перезаписывает.

---

## 7. Открытые вопросы (закрыты)

| #   | Вопрос              | Ответ                                                        |
| --- | ------------------- | ------------------------------------------------------------ |
| 1   | Имя конфига         | `plugins.config.yaml` + `--config=<path>`                    |
| 2   | Флаг                | `--project-root`                                             |
| 3   | `jsonToMd`          | flat (14). Если 3-й сложный (>10) — пересмотрим              |
| 4   | `--list --yaml`     | on-demand, не комитим                                        |
| 5   | L3                  | B: `src/plugins/<name>/` (dev) > `plugins/<name>/` (runtime) |
| 6   | `logLevel` в Wave 2 | только данные, `console.log` не трогаем                      |

---

## 8. Порядок ближайших действий

1. ✅ План согласован (2026-11-12).
2. **Wave 1** — старт.
3. **Wave 2** — после Wave 1 зелёного.
4. **Wave 3** — после Wave 2.
5. **Wave 4** — после Wave 3.
6. **Wave 5** — инкрементально.
7. **Wave 6** — финал.