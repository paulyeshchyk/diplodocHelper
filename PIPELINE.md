# Pipeline — plugins.config.yaml

Документ описывает pipeline-конфиг `diplodoc-helper` (Wave 1–5 REFACTORING.md).
Контракт между `run-pipeline.js` и техписом / CI / Docker.

Пользовательская документация — `docs/docs/ru/Пайплайнсборки/` (в `docs/docs/`).

---

## 1. Зачем

`docs-build.js` — 30+ hardcoded шагов, каждый со своим `args`. Второй проект
требует правки JS. `plugins.config.yaml` переносит конфигурацию в декларацию:
какие модули включены, в каком порядке, с какими опциями. Runtime-код
(`run-pipeline.js`) — неизменен для любого проекта.

Обе команды работают параллельно (`Contributing §11.5`):

```bash
npm run build:pipeline   # новый (yaml или DEFAULT_PIPELINE)
npm run build:legacy     # legacy docs-build.js
```

Пока `plugins.config.yaml` нет — обе команды работают через `DEFAULT_PIPELINE`
(= legacy `docs-build.js`).

---

## 2. Быстрый старт

```bash
# в корне проекта
npx diplodoc-helper init-config --dry-run       # отчёт, ничего не пишет
npx diplodoc-helper init-config                 # создать 5 файлов
npx diplodoc-helper init-config --only=layout,fields
npx diplodoc-helper init-config --force         # перезаписать существующие
```

`init-config` создаёт:

| Файл                                       | Что                                           |
| ------------------------------------------ | --------------------------------------------- |
| `<root>/plugins.config.yaml`               | pipeline-конфиг                               |
| `<docs>/_registry/layout.json`             | «что считать модулем» (prefix, skipDirs, …)   |
| `<docs>/_registry/fields.yaml`             | маппинг frontmatter/пути → измерения каталога |
| `<docs>/_registry/feature-map.config.json` | параметры FM (строки/столбцы/strips)          |
| `<docs>/_registry/dimensions.yaml`         | справочник измерений (skeleton)               |

---

### 2.1. Dev-репо vs installScripts-проект

`package.json`-скрипты `build:pipeline` / `build:legacy` рассчитаны на
**установленный** проект — после `installScripts`, который копирует
`src/plugins/**` → `./plugins/**`. В таком проекте пути `./plugins/run-pipeline.js`
и `./plugins/docs-build.js` валидны.

В **dev-репо** diplodocHelper (`<repo>/src/plugins/...`) эти скрипты дадут
`MODULE_NOT_FOUND`. Используй прямые пути:

```bash
node ./src/plugins/run-pipeline.js --stage=all
node ./src/plugins/docs-build.js --list
node ./src/plugins/diplodoc-helper-cli.js --list

---

## 3. Структура `plugins.config.yaml`

```yaml
lang: ru

common:
  logLevel: off              # off|info|warning|error
  stopOnError: true
  dryRun: false

stages:
  pre:
    - module: collectCatalog
    - module: buildPageLegend
      options: { rewrite: true, withInclude: true }
    - module: emitFeatureMap
      options: { logLevel: info }           # L2 override L1
    - module: gosts
      enabled: false                         # MES: без ГОСТов
  build: []
  post:
    - module: footnoteAnchors
    - module: gostsInject
      enabled: false
```

**Резервные ключи** элемента: `module`, `enabled`, `options`. Всё остальное —
**не** резервное, `options` — рекомендуемый контейнер для специфичных флагов.

**Семантика `enabled`:**

| Файла нет          | module нет     | `enabled` нет | `enabled: true` | `enabled: false` |
| ------------------ | -------------- | ------------- | --------------- | ---------------- |
| `DEFAULT_PIPELINE` | не запускается | запускается   | запускается     | отключён         |

---

## 4. Порядок = порядок в YAML

`ModuleDef.defaultOrder` — только suggestion для `init-config` (в какой
последовательности скаффолдить). В runtime порядок **буквальный** = порядок
элементов в `stages.<phase>`. Перестановка двух строк меняет порядок.

`dependsOn` — только для validation в `init-config` (warn, не падает).

---

## 5. Merge опций — 4 уровня

```
effectiveOpts(module) = merge(
    L4: ModuleDef.args[].default,              # дефолт в коде (deprecated)
    L3: <pluginDir>/plugin.config.{yaml,json}, # dev override
    L1: <yaml>.common,                         # общий
    L2: <yaml>.stages.<phase>[].options        # точечно для модуля
)
```

**Приоритет: L2 > L1 > L3 > L4.**

- L2 > L3: явное решение в yaml проекта доминирует над dev-забывчивостью;
- L1 > L3: `logLevel: off` для всех модулей перебивает случайный debug в плагине;
- L4 — дефолт в `ModuleDef`, уйдёт в отдельной волне.

---

## 6. Резолюция путей

Приоритет:

1. `--config=<path>` — явный флаг для CI/Docker;
2. `PLUGINS_CONFIG_PATH` env — shell-wrapper;
3. `<projectRoot>/plugins.config.yaml` — локально техпис;
4. `DEFAULT_PIPELINE` (код) — back-compat.

`<projectRoot>` — walk up от `process.cwd()` до первого `package.json`,
либо `DOCS_PROJECT_ROOT` env, либо `--project-root=<path>`.

---

## 7. L3 — конфиг плагина (dev override)

Два места, оба опциональны:

1. `<projectRoot>/src/plugins/<name>/plugin.config.{yaml,yml,json}` — dev;
2. `<projectRoot>/plugins/<name>/plugin.config.{yaml,yml,json}` — runtime.

Приоритет: dev > runtime. **Не используется** для L1/L2.

---

## 8. CLI

```bash
# Список мигрированных модулей
npx diplodoc-helper --list
npx diplodoc-helper --list --yaml          # machine-readable

# Справка по модулю
npx diplodoc-helper collectCatalog --help

# Прямой запуск модуля (без pipeline)
npx diplodoc-helper collectCatalog --lang=ru --module-prefix=Модуль

# Pipeline
node ./plugins/run-pipeline.js --stage=all
node ./plugins/run-pipeline.js --stage=pre --config=./ci/plugins.config.yaml
node ./plugins/run-pipeline.js --stage=post --dry-run      # только печатает config
```

**`--stage`** — `pre` | `build` | `post` | `all` (default).

---

## 9. Fallback

Обе команды в `package.json` (`Contributing §11.5`):

```json
"build:pipeline": "node ./plugins/run-pipeline.js --stage=all",
"build:legacy":   "node ./plugins/docs-build.js"
```

Пока `plugins.config.yaml` нет — `build:pipeline` работает через
`DEFAULT_PIPELINE` = legacy `docs-build.js`. Deprecation `docs-build.js` —
после end-to-end-валидации.

---

## 10. Отладка

### 10.1. `--list --yaml` — полный список

```bash
npx diplodoc-helper --list --yaml
```

Выдаёт `[{ name, phase, defaultOrder, description, dependsOn, args }]`.
On-demand, не коммитится.

### 10.2. `init-config --dry-run`

```bash
npx diplodoc-helper init-config --dry-run
npx diplodoc-helper init-config --dry-run --project-root=/abs/path
```

Не пишет ничего. Показывает, какие файлы были бы созданы.

### 10.3. `--help` у модуля

```bash
npx diplodoc-helper reindexFigures --help
```

Три уровня: имя + описание, phase, `dependsOn`, `args: [--flag1, --flag2]`.
Без per-option описания — детали в `<module>.module.ts`.

### 10.4. `MODULE_TYPELESS_PACKAGE_JSON`

Известный warning (`Contributing §2.2`). Не фиксить через `"type": "module"`
(сломает `.js` с `require`). Решение — CLI-A (прекомпиляция `.ts` → `.js`).

---

## 11. Миграция с `docs-build.js`

### 11.1. Автоматически

```bash
npx diplodoc-helper init-config --force
```

Создаст `plugins.config.yaml`, повторяющий `DEFAULT_PIPELINE` = legacy.
Далее — правки вручную по мере необходимости.

### 11.2. Вручную

1. Открыть `docs-build.js`, посмотреть `STEPS.pre/build/post`.
2. Для каждого шага `cli('name', ...args)` → `{ module: name, options: {...} }`.
3. Для каждого шага `node('./script.js', ...args)` — это **не** модуль,
   оставить как есть или обернуть в `ModuleDef` (Wave 5.5).
4. `run(fn)` (inline-функция) — оставить в legacy или вынести в модуль.

### 11.3. Что **не** в `DEFAULT_PIPELINE` (opt-in)

| Модуль          | Причина                                                  |
| --------------- | -------------------------------------------------------- |
| `jsonToMdTable` | 14 специфичных аргументов, вызов 7 раз с разными опциями |
| `roadMap`       | требует `dataPath` / `dataRaw` (проектные данные)        |
| `footnoteList`  | требует `targetHtml` (проектный путь в build)            |

Всё остальное (включая `cleanBuild`, `diplodocBuild`, `copyMdeditFixes`,
`cleanupServiceFiles`) — в дефолте. `run-pipeline --stage=all` без
`plugins.config.yaml` покрывает 100% legacy `docs-build.js`.

---

## 12. Ссылки

- `REFACTORING.md` — план рефакторинга, Wave 1–6.
- `CONTRIBUTING.md` (§11) — принципы pipeline-конфига.
- `src/plugins/cli/types.ts` — `ArgSpec`, `ModuleDef`, `ModuleImpl`.
- `src/plugins/cli/pipeline.constants.ts` — `DEFAULT_PIPELINE`.
- `src/plugins/cli/pipeline.merge.ts` — L1–L4 merge.
- `src/plugins/cli/registry.ts` — `CommandRegistry`.