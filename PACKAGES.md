# Guide: Plugins as npm modules with real dependencies

Документ описывает, как перевести плагины `src/plugins/**` в полноценные
npm-модули (`@diplodoc-helper/*`) с явными зависимостями, версионированием
и установкой друг через друга.

Опирается на фактическое состояние кодовой базы (после Wave C):
уже собран `@diplodoc-helper/logger@0.1.0` (tarball `diplodoc-helper-logger-0.1.0.tgz`),
остальные модули — legacy `.js`/`.ts` внутри `src/plugins/`.

---

## 0. TL;DR — правила, которые нельзя нарушать

1. **Stateful-singletons → `peerDependencies`, не `dependencies`.**
   `@diplodoc-helper/logger` держит `instance: Logger | null`. Если `gosts` и
   `abbrs` получат по собственной копии логгера, `initLogger()` в
   `pipeline.cli.ts` сконфигурирует только одну из них. `peerDependency`
   означает «хост предоставляет одну копию для всех».
2. **Utility-пакеты без состояния → `dependencies`.**
   `Sanitizer`, `String_Transliterate_Cyrillic`, `Path_ToPosix` — чистые
   функции. Копии не страшны, дублирование дерева зависимостей не вредит.
3. **Версия `0.x` — осторожно.** `^0.1.0` разрешает только `0.1.z` (patch).
   Не «сломается» случайно при `0.2.0` — увидишь явно.
4. **Tarball-путь (`npm pack`) не отменяет workspaces.** Workspaces — для
   локальной разработки (симлинки в `node_modules`), tarball — для внешнего
   потребителя. Одно другому не мешает.
5. **Публиковать только собранное (`dist/`).** Уже настроено в
   `logger/package.json` (`files`, `prepare`, `main`).

---

## 1. Discovery — карта зависимостей (текущий код)

Проверено по факту импортов в `src/plugins/**`. «Зависит от» — только те
зависимости, которые **уже присутствуют** в коде (не гипотетические).

### 1.1. Ядро (никого не импортирует, кроме npm-пакетов)

| Пакет                             | Что внутри                                                      | Зависит от          |
| --------------------------------- | --------------------------------------------------------------- | ------------------- |
| `@diplodoc-helper/logger`         | `utils/logger/*`                                                | — (только `node:*`) |
| `@diplodoc-helper/sanitize`       | `utils/sanitize.js`                                             | —                   |
| `@diplodoc-helper/string-utils`   | `utils/string/*`                                                | —                   |
| `@diplodoc-helper/html-utils`     | `utils/html/Html_Escape_*`, `Html_Classify_File`                | —                   |
| `@diplodoc-helper/path-utils`     | `utils/path/Path_ToPosix`, `path.directory`, `path.extract`     | —                   |
| `@diplodoc-helper/link-classify`  | `utils/link/Link_Classify_External`, `shared/parser/md/mdLinks` | —                   |
| `@diplodoc-helper/module-types`   | `cli/types.ts`, `cli/config.constants.ts`                       | —                   |
| `@diplodoc-helper/module-helpers` | `cli/module-helpers.ts`, `cli/pipeline.cli.args.ts`             | —                   |

### 1.2. Tier 1 (зависит от ядра)

| Пакет                                | Что внутри                                                                                                          | Зависит от                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `@diplodoc-helper/string-translit`   | `String_Transliterate_Cyrillic`                                                                                     | —                                              |
| `@diplodoc-helper/url-transform`     | `Url_Transform_{Segment,Reference,Filename}`                                                                        | `string-utils`                                 |
| `@diplodoc-helper/inline-annotation` | `InlineAnnotation_{Mask,TextRange,Make_AnchorId}`                                                                   | `url-transform`, `string-utils`, `html-utils`  |
| `@diplodoc-helper/fs-utils`          | `Fs_Walk_Directory`, `Fs_Find_Module_Dirs`                                                                          | `path-utils`                                   |
| `@diplodoc-helper/frontmatter`       | `Frontmatter_Split_Raw`, `frontmatter.utils`, `frontmatter.section.*`, `frontmatter.model`, `frontmatter.templates` | —                                              |
| `@diplodoc-helper/yaml-utils`        | `yaml.*.js`, `yaml.base.js`                                                                                         | `frontmatter`                                  |
| `@diplodoc-helper/md-links`          | `md.links.{extract,figure,update}`, `link.utils.js`                                                                 | `link-classify`, `path-utils`, `url-transform` |
| `@diplodoc-helper/slugify`           | `encoding.slugify.js`, `transliterate.js`                                                                           | `url-transform`                                |

### 1.3. Tier 2 — фича-модули (потребители ядра)

**Явные зависимости** (проверены по `require`/`import`):

```
abbrs    → logger, sanitize, url-transform, string-utils, fs-utils,
           inline-annotation, frontmatter, html-utils
terms    → logger, sanitize, url-transform, string-utils, fs-utils,
           inline-annotation, frontmatter, html-utils
gosts    → logger, sanitize, url-transform, fs-utils,
           inline-annotation, frontmatter, html-utils,
           abbrs (dictionary/paths/model/injector),
           terms (dictionary/paths/model/injector),
           module-helpers (findSectionIndexHtml/resolveBuildDir/resolveLangDir)

reindexer             → yaml-utils, frontmatter, md-utils, cli/manifest
docs-registry         → frontmatter, fs-utils, path-utils, string-utils,
                        module-helpers, logger
helpMap               → frontmatter
breadcrumb            → fs-utils, html-utils, path-utils
comments              → fs-utils, html-utils
context-tags          → fs-utils, html-utils
contexts              → frontmatter, fs-utils, html-utils, url-transform
helptags              → frontmatter, fs-utils
figures               → fs-utils, html-utils, url-transform
json-to-md            → string-utils, html-utils
roadMap               → contexts/modules/tabs (генерация YAML-tabs)
contentNavigator      → helpMap, frontmatter, html-utils, md-links
footnoteNumbering     → yaml-utils, frontmatter
footnoteAnchors       → html-utils
tocCleanMode          → fs-utils
mdedit_fixes          → (browser, не Node)
```

### 1.4. Tier 3 — не выделяем в отдельные пакеты (пока)

Остаются как часть **основного** пакета `diplodochelper`:

- `cli/modules.ts` — импортирует **все** Tier 2. Это вершина пирамиды,
  выделение бессмысленно (циклическая зависимость по определению).
- `cli/registry.ts`, `cli/args.ts`, `cli/pipeline.*.ts`, `cli/run.ts`
- `extension.js`, `commands/*` (VS Code-специфика, `vscode` — peer)
- `server/server.js` (long-running, отдельный деплой, пока не трогаем)
- `*.client.js` (browser-IIFE, отдельный рантайм)

---

## 2. Критическое правило: stateful-singleton → `peerDependency`

`@diplodoc-helper/logger` — **не** чистая функция. Это **singleton**:

```ts
// utils/logger/index.ts (упрощённо)
let instance: Logger | null = null;
export function getLogger() { return instance ?? initLogger(); }
export function initLogger(opts) { instance = new Logger(...); }
```

Проблема, если логгер — `dependency`:

```
diplodocHelper/node_modules/
├── @diplodoc-helper/logger@0.1.0    ← копия A (для pipeline)
├── @diplodoc-helper/abbrs/
│   └── node_modules/
│       └── @diplodoc-helper/logger@0.1.0    ← копия B
└── @diplodoc-helper/gosts/
    └── node_modules/
        └── @diplodoc-helper/logger@0.1.0    ← копия C
```

`pipeline.cli.ts` вызывает `initLogger()` → конфигурирует **копию A**.
`abbrs` в `createLogger('abbrs')` берёт **копию B** — там `instance = null`,
она lazy-init-ится в `off` и **молчит**, хотя пользователь просил `info`.

Решение — `peerDependency`:

```json
{
  "name": "@diplodoc-helper/gosts",
  "peerDependencies": {
    "@diplodoc-helper/logger": "^0.1.0"
  }
}
```

npm создаёт копию логгера **только в корне** `node_modules/` (одна на всех).
`gosts` видит ту же копию, что `pipeline`. Хост (`diplodochelper` package.json)
явно объявляет её как `dependency`.

**Правило**: если модуль хранит mutable state (singleton, кеш, открытый
`fs.WriteStream`, `http.Server`) — только `peerDependency`.

**Что НЕ `peerDependency`**: `Sanitizer`, `String_Transliterate_Cyrillic`,
`Path_ToPosix`, `InlineAnnotation_Mask`, `Url_Transform_*` — чистые функции.
Дублирование не вредит, версии независимы. `dependency`.

---

## 3. Пирамида пакетов

```
Tier 3 (не выделяем)         diplodochelper (root package.json)
                             ├─ cli/registry, cli/modules, cli/pipeline
                             ├─ extension.js, commands/*
                             └─ server/ (отдельно)

Tier 2 (фичи)                gosts  abbrs  terms  reindexer
                             docs-registry  helpMap  breadcrumb
                             comments  context-tags  contexts  helptags
                             figures  json-to-md  roadMap  contentNavigator
                             footnoteNumbering  footnoteAnchors  tocCleanMode

Tier 1 (обвязка)             fs-utils  frontmatter  yaml-utils
                             inline-annotation  md-links  slugify
                             url-transform

Tier 0 (ядро)                logger  sanitize  string-utils  html-utils
                             path-utils  link-classify
                             module-types  module-helpers
```

Правило: **Tier N зависит только от Tier < N и того же Tier**. Никаких
циклических зависимостей.

---

## 4. Worked example: `gosts` → `logger`

Показываю полный путь для **одного** модуля. Остальные (Tier 2) пойдут по
тому же шаблону.

### Stage A — перевести `gosts` в workspace

**A.1.** Создать `src/plugins/gosts/package.json`:

```json
{
  "name": "@diplodoc-helper/gosts",
  "version": "0.1.0",
  "private": true,
  "description": "Справочник ГОСТов для Diplodoc Helper",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.js"
    },
    "./module": {
      "types": "./dist/gosts.module.d.ts",
      "require": "./dist/gosts.module.js"
    }
  },
  "files": ["dist/**/*"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepare": "npm run build"
  },
  "peerDependencies": {
    "@diplodoc-helper/logger": "^0.1.0",
    "@diplodoc-helper/abbrs": "^0.1.0",
    "@diplodoc-helper/terms": "^0.1.0"
  },
  "dependencies": {
    "@diplodoc-helper/sanitize": "^0.1.0",
    "@diplodoc-helper/url-transform": "^0.1.0",
    "@diplodoc-helper/fs-utils": "^0.1.0",
    "@diplodoc-helper/inline-annotation": "^0.1.0",
    "@diplodoc-helper/frontmatter": "^0.1.0",
    "@diplodoc-helper/html-utils": "^0.1.0",
    "@diplodoc-helper/module-helpers": "^0.1.0",
    "js-yaml": "^4.1.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

**Почему `logger`, `abbrs`, `terms` — peer, а не dependency?**

- `logger` — stateful singleton (правило §2).
- `abbrs`/`terms` — **тоже stateful в перспективе**. Сейчас они без
  `getInstance`, но `gosts.injector.js` использует `loadAbbrDictionary()` /
  `loadTermDictionary()` — а словари читают файлы и, если позже добавят кеш
  или watcher, станут stateful. Безопаснее сразу `peer`. Альтернатива —
  `dependency` с `^0.1.0`, но если у `abbrs` появится кеш, придётся
  ретроактивно переносить в `peer`, что больнее.

**A.2.** `tsconfig.build.json` рядом:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "types": ["node"]
  },
  "include": [
    "gosts.ts", "gosts.js",
    "gosts.dictionary.ts", "gosts.dictionary.js",
    "gosts.dictionary.writer.ts", "gosts.dictionary.writer.js",
    "gosts.collector.ts", "gosts.collector.js",
    "gosts.injector.ts", "gosts.injector.js",
    "gosts.module.ts", "gosts.injector.module.ts",
    "gosts.paths.ts", "gosts.paths.js",
    "gosts.writer.ts", "gosts.writer.js",
    "gosts.types.ts"
  ],
  "exclude": ["**/*.test.*", "dist", "node_modules"]
}
```

Обрати внимание: `include` перечисляет **реально существующие файлы**.
Многие — ещё `.js`, потому что миграция на `.ts` — отдельная волна. `tsc`
работает с `allowJs: true` (в `tsconfig.build.json` этого нет, значит `.js`
**не эмитятся** — надо добавить `"allowJs": true` и `"declaration": true`
для `.d.ts` рядом с `.js`; но для `gosts` проще оставить `.js` как есть
и не эмитить их — импортироваться будут из `src/`, а в `dist/` попадут
только `.ts`-файлы, остальное — из исходников через `files`).

**A.3.** Добавить `dist/` и `node_modules/` в `src/plugins/gosts/.gitignore`:

```gitignore
dist/
node_modules/
*.tgz
```

### Stage B — добавить `gosts` в root workspaces

**B.1.** В корневом `package.json` (не в `src/plugins/gosts/`):

```json
{
  "workspaces": [
    "src/plugins/utils/logger",
    "src/plugins/utils/sanitize",
    "src/plugins/utils/string",
    "src/plugins/utils/html",
    "src/plugins/utils/path",
    "src/plugins/utils/link",
    "src/plugins/utils/url",
    "src/plugins/utils/inline-annotation",
    "src/plugins/utils/fs",
    "src/plugins/utils/frontmatter",
    "src/plugins/abbrs",
    "src/plugins/terms",
    "src/plugins/gosts"
  ],
  "dependencies": {
    "@diplodoc-helper/logger": "^0.1.0",
    "@diplodoc-helper/sanitize": "^0.1.0",
    "@diplodoc-helper/string-utils": "^0.1.0",
    "@diplodoc-helper/html-utils": "^0.1.0",
    "@diplodoc-helper/path-utils": "^0.1.0",
    "@diplodoc-helper/link-classify": "^0.1.0",
    "@diplodoc-helper/fs-utils": "^0.1.0",
    "@diplodoc-helper/inline-annotation": "^0.1.0",
    "@diplodoc-helper/url-transform": "^0.1.0",
    "@diplodoc-helper/frontmatter": "^0.1.0",
    "@diplodoc-helper/abbrs": "^0.1.0",
    "@diplodoc-helper/terms": "^0.1.0",
    "@diplodoc-helper/gosts": "^0.1.0"
  }
}
```

`npm install` в корне:
- симлинкует каждый workspace в `node_modules/@diplodoc-helper/*`;
- резолвит `peerDependencies` к workspace-версии;
- **одна** копия `@diplodoc-helper/logger` на всё дерево.

**B.2.** Проверка:

```bash
npm install
ls node_modules/@diplodoc-helper/
# → logger  gosts  abbrs  terms  sanitize  ...  (симлинки)
readlink node_modules/@diplodoc-helper/logger   # Linux/macOS
# → ../../src/plugins/utils/logger
```

### Stage C — переключить `gosts` на импорт пакета

В `src/plugins/gosts/gosts.js`:

```diff
- const { createLogger } = require('../utils/logger');
+ const { createLogger } = require('@diplodoc-helper/logger');
```

В `src/plugins/gosts/gosts.module.ts`:

```diff
- import { createLogger } from '../utils/logger/index.ts';
+ import { createLogger } from '@diplodoc-helper/logger';
```

В `src/plugins/gosts/gosts.injector.js` (зависимости от `abbrs`/`terms`):

```diff
- const { loadTermDictionary } = require('../terms/terms.dictionary.js');
- const { getTermOutputUrl } = require('../terms/terms.paths.js');
- const { termAnchorId } = require('../terms/terms.model.js');
- const { renderTooltipHtml: renderTermTooltipHtml } =
-     require('../terms/terms.injector.js');
+ const { loadTermDictionary } = require('@diplodoc-helper/terms/dictionary');
+ const { getTermOutputUrl } = require('@diplodoc-helper/terms/paths');
+ const { termAnchorId } = require('@diplodoc-helper/terms/model');
+ const { renderTooltipHtml: renderTermTooltipHtml } =
+     require('@diplodoc-helper/terms/injector');
```

Правило: `@diplodoc-helper/<pkg>/<subpath>` — каждый публичный вход объявлен
в `exports` пакета (см. пример `gosts/package.json` выше, там `./module`
и корень). Экспортируй **только то, что действительно нужно потребителям**;
`gosts.injector` нужен `terms/injector`, `terms/dictionary`, `terms/paths`,
`terms/model` — их и добавляй в `@diplodoc-helper/terms/exports`, а
`terms.collector`, `terms.writer` — **не** добавляй (внутренние).

### Stage D — версионирование и релиз `logger`

Ты уже сделал `@diplodoc-helper/logger@0.1.0` tarball. Что делать при
изменениях:

**D.1. Patch (`0.1.0 → 0.1.1`)** — bugfix, обратная совместимость
сохранена. `gosts` с `^0.1.0` подхватит **автоматически** при `npm install`
(или `npm update`).

```bash
# В src/plugins/utils/logger/
npm version patch     # → 0.1.1, обновляет package.json + git tag
npm run build
npm pack              # → diplodoc-helper-logger-0.1.1.tgz
```

**D.2. Minor (`0.1.1 → 0.2.0`)** — новая функциональность, обратная
совместимость сохранена. `gosts` с `^0.1.0` **не подхватит** —
`^0.1.0` = `>=0.1.0 <0.2.0`. Пользователь должен явно обновить `gosts`
до `^0.2.0`, иначе останется на `0.1.x`.

Это семантика `0.x`: **`caret` ведёт себя как `tilde`** (`^0.1.0` ≡ `0.1.x`).
Для «стабильных» версий (`1.0.0+`) `^1.0.0` = `>=1.0.0 <2.0.0`.

**D.3. Major (`0.2.0 → 1.0.0` или `1.0.0 → 2.0.0`)** — breaking changes.
`gosts` продолжает требовать `^0.1.0` / `^1.0.0`, ничего не ломается.
Обновление — **явное** действие пользователя: поднять `gosts`
`peerDependencies` до `^1.0.0` (или `^2.0.0`), протестировать, выпустить
`gosts@0.2.0`.

**D.4. Таблица версий для `0.x`-периода (сейчас)**

| Изменение в `logger` | Действие          | Кто должен обновиться            |
| -------------------- | ----------------- | -------------------------------- |
| bugfix               | `patch` → `0.1.1` | никто (автоматически)            |
| новая фича           | `minor` → `0.2.0` | `gosts`, `abbrs`, `terms` — явно |
| breaking             | `major` → `1.0.0` | все потребители — явно           |

**D.5. Как обновить `gosts` под новый `logger@0.2.0`**

```bash
# 1. В src/plugins/utils/logger/
npm version minor         # 0.1.0 → 0.2.0
npm run build
npm pack                  # → diplodoc-helper-logger-0.2.0.tgz

# 2. В src/plugins/gosts/package.json:
#   "peerDependencies": {
#     "@diplodoc-helper/logger": "^0.2.0"      ← было ^0.1.0
#   }
#   "version": "0.2.0"                          ← bump gosts тоже, т.к. peer изменился

# 3. Корневой package.json:
#   "dependencies": {
#     "@diplodoc-helper/logger": "^0.2.0",      ← было ^0.1.0
#     "@diplodoc-helper/gosts":  "^0.2.0"       ← было ^0.1.0
#   }

# 4. npm install (в корне) — резолвит новые версии
# 5. npm test — убедиться, что не сломали ничего
# 6. npm pack --workspaces — новые tarball'ы для деплоя
```

**Почему `gosts` тоже bump'ается до `0.2.0`?** Потому что изменился его
**контракт с хостом**: `peerDependency` `^0.1.0` → `^0.2.0`. Формально
semver-правило: изменение `peer`-range — breaking change для `gosts`
(проект на `logger@0.1.0` не сможет поставить `gosts@0.2.0`). Даже если
сам код `gosts` не поменялся. Если не бомбить — легко получить
`gosts@0.1.5` с `peer logger@^0.2.0` в проекте, где logger `0.1.x` —
npm выдаст `ERESOLVE peer dependency conflict`, и пользователь потратит
полдня на разбор.

### Stage E — проверка

```bash
# 1. Workspaces корректны:
npm ls @diplodoc-helper/logger --all
# → diplodochelper@... 
#     └── @diplodoc-helper/logger@0.1.0   ← одна копия, не три

# 2. Сборка:
npm run type-check
npm test

# 3. Реальный прогон (logger должен honor'ить logLevel):
node ./src/plugins/run-pipeline.js --stage=pre 2>&1 | grep '\[gosts\]'
# → [gosts]  INFO  ru: N в словаре, ... (или warning, если словарь пуст)

DIPLODOC_LOG_LEVEL=off node ./src/plugins/run-pipeline.js --stage=pre 2>&1 | grep -c '\[gosts\]'
# → 0

# 4. Tarball'ы для внешнего деплоя (сценарий 3a):
npm pack --workspaces
# → diplodoc-helper-logger-0.1.0.tgz
#   diplodoc-helper-gosts-0.1.0.tgz
#   diplodoc-helper-abbrs-0.1.0.tgz
#   diplodoc-helper-terms-0.1.0.tgz
#   ...

# 5. Внешний проект ставит ВСЁ сразу (порядок важен — peer требует хост первым):
cd /path/to/MyProj
npm install /abs/path/diplodoc-helper-logger-0.1.0.tgz
npm install /abs/path/diplodoc-helper-abbrs-0.1.0.tgz
npm install /abs/path/diplodoc-helper-terms-0.1.0.tgz
npm install /abs/path/diplodoc-helper-gosts-0.1.0.tgz
# или одной строкой (npm сам разберётся по peerDependencies):
npm install /abs/path/diplodoc-helper-{logger,abbrs,terms,gosts}-0.1.0.tgz
```

---

## 5. Versioning policy (общая, на весь монорепо)

**Фаза `0.x` (текущая): lockstep.**

Все пакеты стартуют с `0.1.0`. При любом изменении в **любом** пакете —
bump всех пакетов одной командой:

```bash
npm version 0.2.0 --workspaces
npm version 0.2.0           # корневой package.json
```

Плюс: никогда не будет рассинхронизации версий. Минус: если поменялся
только `logger`, `gosts` тоже получает `0.2.0` «ни за что». Это нормально
на этапе активной разработки (сейчас).

**Фаза `1.0.0+` (потом): независимые версии.**

Когда API стабилизируется и пакетов станет >10, переходим на независимые
версии (как `@angular/*`, `@nestjs/*`). Тогда `logger@1.5.2`, `gosts@1.2.0`,
`abbrs@1.1.0` — каждая со своим lifecycle.

**Правила bump'а (общие для обеих фаз):**

| Что изменилось                         | Версия                                      | `peerDependencies` потребителя         |
| -------------------------------------- | ------------------------------------------- | -------------------------------------- |
| bugfix                                 | patch                                       | не меняется                            |
| новая функция (обратная совместимость) | minor                                       | не меняется (но `^X.Y` не подхватит)   |
| breaking change                        | major                                       | нужно явно поднять у всех потребителей |
| изменился `peer`-range                 | patch самого пакета + **minor** потребителя | да, иначе `ERESOLVE`                   |
| добавили новый `peerDependency`        | major самого пакета + **minor** потребителя | да                                     |

**Правило про `peerDependencies`:** если ты добавил новую `peerDependency`
(например, `gosts` начал требовать `@diplodoc-helper/logger`), а `gosts`
уже `0.1.0` у пользователя — `gosts@0.1.0` **не сломается** (у него в
`package.json` нет этой peer). Но `npm install gosts@0.1.0` в новом проекте
**не поставит** logger — он будет в `unmet peer dependency`. Решение:
bump `gosts` до `0.2.0` в момент добавления peer, чтобы `npm install`
в новом проекте явно показал «нужен logger».

---

## 6. Workspaces vs tarball vs private registry

Ты сказал: «registry нет, сценарий 3 (tarball) меня устраивает».

**Рекомендация:** workspaces — **для разработки** внутри
`diplodocHelper`. Tarball — **для внешней поставки**. Оба сосуществуют.

| Задача                      | Инструмент                                    | Когда  |
| --------------------------- | --------------------------------------------- | ------ |
| Dev внутри репо             | `workspaces` + симлинки                       | всегда |
| Внешний проект без registry | `npm pack --workspaces` + `npm install <tgz>` | сейчас |
| Внешний проект с registry   | `npm publish --workspaces --registry=<url>`   | потом  |
| CI/CD                       | tarball + `DIPLODOC_LOG_LEVEL` env            | сейчас |

Workspaces **не отменяют** tarball: `npm pack --workspaces` собирает
`dist/` каждого workspace, пакует в `*.tgz` с правильной структурой
(`package/dist/*`, `package/package.json`) — ровно то, что нужно
`npm install` снаружи. А `npm install` в `diplodocHelper` использует
workspaces (симлинки), не tarball'ы.

**Local dev удобнее с workspaces, чем с `file:`-зависимостями:**
- `file:../logger` — npm **копирует** директорию, правки в `logger/` не
  видны в `gosts/` без `npm install` заново;
- `workspaces` — симлинк, правки видны сразу.

Пока у тебя «папка `src/plugins/` и есть всё», `workspaces` — это
**декларация**: «вот директории, которые надо трактовать как пакеты».
Остальной код (`cli/`, `commands/`, `extension.js`) остаётся **не** в
workspaces, живёт как часть корневого пакета.

---

## 7. Чек-лист: полный путь `gosts → logger`

Проверяй по пунктам. Если все зелёные — миграция удалась.

**Подготовка (один раз на проект)**
- [ ] В корневом `package.json` добавлен блок `workspaces` со списком
      директорий-пакетов.
- [ ] `npm install` в корне создаёт `node_modules/@diplodoc-helper/*` —
      симлинки.
- [ ] `npm ls @diplodoc-helper/logger --all` показывает **одну** копию.

**Для каждого feature-модуля (`gosts` как пример)**
- [ ] `src/plugins/gosts/package.json` создан, содержит `name`,
      `version: "0.1.0"`, `main`/`types`/`exports`, `files: ["dist/**/*"]`,
      `scripts.prepare`, `peerDependencies` (logger, abbrs, terms),
      `dependencies` (sanitize, fs-utils, ...), `engines.node: ">=18.0.0"`.
- [ ] `tsconfig.build.json` рядом, `outDir: "./dist"`, `declaration: true`,
      `allowImportingTsExtensions: true`, `rewriteRelativeImportExtensions: true`.
- [ ] `.gitignore` содержит `dist/`, `node_modules/`, `*.tgz`.
- [ ] Все `require('../utils/logger')` → `require('@diplodoc-helper/logger')`.
- [ ] Все `require('../abbrs/*')` → `require('@diplodoc-helper/abbrs/<subpath>')`.
- [ ] Все `require('../terms/*')` → `require('@diplodoc-helper/terms/<subpath>')`.
- [ ] В `@diplodoc-helper/abbrs`/`terms` `exports` добавлены нужные
      subpath'ы (`./dictionary`, `./paths`, `./model`, `./injector`).
- [ ] `npm install` в корне — без `ERESOLVE`.
- [ ] `npm run type-check` — зелёный.
- [ ] `npm test` — 184/184 suites (или сколько у тебя), 0 failed.
- [ ] `node ./src/plugins/run-pipeline.js --stage=pre` — `[gosts]` работает.
- [ ] `DIPLODOC_LOG_LEVEL=off node ./src/plugins/run-pipeline.js --stage=pre`
      — `[gosts]` **не** печатается.
- [ ] `npm pack --workspaces` — создаёт корректные tarball'ы.
- [ ] `tar -tf diplodoc-helper-gosts-0.1.0.tgz` — внутри `package/dist/*`,
      `package/package.json`, никаких `src/`, `.test.*`, `node_modules`.

**Релиз `logger` после этого**
- [ ] `npm version patch` (или `minor`, `major`) в `logger/`.
- [ ] `npm run build` в `logger/`.
- [ ] `npm pack` → `diplodoc-helper-logger-0.X.Y.tgz`.
- [ ] Если `minor`/`major` — обновить `peerDependencies` у всех потребителей
      (`gosts`, `abbrs`, `terms`), bump'нуть их версии, обновить root
      `package.json`.

---

## 8. Анти-паттерны (чего не делать)

1. **`dependencies: { "@diplodoc-helper/logger": "^0.1.0" }`** — сломает
   singleton. Всегда `peerDependencies` для stateful.
2. **`import ... from '../utils/logger'`** — не работает в собранном
   `dist/`. Только `@diplodoc-helper/logger`.
3. **`import ... from '../abbrs/abbrs.dictionary.js'`** — тянет `.js`-файл
   напрямую. Только `@diplodoc-helper/abbrs/dictionary` (subpath из `exports`).
4. **`"private": true` + `npm publish`** — не сработает. Для внутренних
   пакетов, которые **не** публикуются, `private: true` ок; для внешних —
   `private: false`.
5. **`files: ["*"]`** — утащит `.test.ts`, `tsconfig.build.json`, `.gitignore`.
   Всегда явно `["dist/**/*", "README.md"]`.
6. **`peerDependencies: { "logger": "*" }`** — сломает npm 7+ с
   `ERESOLVE` на любом проекте. Всегда конкретный диапазон `^0.X.0`.
7. **Bump `gosts` без bump `peer`-range** — пользователь в `0.1.5`
   получит `gosts`, у которого `peerDependencies: { logger: ^0.2.0 }`, но
   `logger@0.1.0` в проекте → `ERESOLVE`. Bump'ать вместе.
8. **`dist/` в git** — не коммитить. `prepare` восстановит. В `.gitignore`.
9. **`node_modules/` внутри `src/plugins/gosts/`** — артефакт локального
   `npm install` в подпакете. `workspaces` решает это (ставит всё в корень).
   Если появился — удалить.
10. **`@diplodoc-helper/logger/index.ts` в `exports` внешнего пакета** —
    ломает потребителей на Node < 22.6. В `exports` — только `dist/*.js`.

---

## 9. Roadmap

| Волна | Пакеты                                                                                                                                                                                                                    | Зависит от            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| ✅ W-A | `logger@0.1.0`                                                                                                                                                                                                            | —                     |
| W-P1  | `sanitize`, `string-utils`, `html-utils`, `path-utils`, `link-classify`                                                                                                                                                   | —                     |
| W-P2  | `url-transform`, `inline-annotation`, `fs-utils`, `frontmatter`, `yaml-utils`, `md-links`, `slugify`                                                                                                                      | W-P1                  |
| W-P3  | `module-types`, `module-helpers`                                                                                                                                                                                          | —                     |
| W-P4  | `abbrs`, `terms` (первыми, потому что от них зависит `gosts`)                                                                                                                                                             | W-A, W-P1, W-P2       |
| W-P5  | `gosts` (worked example §4)                                                                                                                                                                                               | W-A, W-P1, W-P2, W-P4 |
| W-P6  | `reindexer`, `docs-registry`, `helpMap`, `breadcrumb`, `comments`, `context-tags`, `contexts`, `helptags`, `figures`, `json-to-md`, `roadMap`, `contentNavigator`, `footnoteNumbering`, `footnoteAnchors`, `tocCleanMode` | W-A, W-P1, W-P2, W-P3 |
| W-P7  | Корневой `diplodochelper` — `dependencies` на все W-P4..P6                                                                                                                                                                | всё                   |
| W-P8  | `npm publish --workspaces` в приватный registry (если/когда появится)                                                                                                                                                     | всё                   |

W-P4 идёт раньше W-P5, потому что `gosts.injector.js` требует
`terms/injector`, `terms/dictionary`, `terms/paths`, `terms/model` и
симметрично `abbrs/*` — если `gosts` выделить раньше, `peerDependencies`
не резолвятся.