---
title: Contributing
sectionType: Page
pureTitle: Contributing
sectionIndex: ""
---

Документ о том, как мы пишем код, тесты и миграции в этом репозитории.
Не «best practices вообще», а конкретные правила, которые мы уже
применяем. Новое правило сюда попадает только после того, как
применено в реальной волне изменений.

---

# Contributing

Документ о том, как мы пишем код, тесты и миграции в этом репозитории.
Не «best practices вообще», а конкретные правила, которые мы уже
применяем. Новое правило сюда попадает только после того, как
применено в реальной волне изменений.

---

## 1. Тестовая дисциплина

### 1.1. Нумерация кейсов

Каждый `it` / `test` имеет номер по шаблону:

```
<featureId>.<sub>.<subsub>#<case>
```

- `featureId` — `id` модуля из `docs/_generated/catalog.<lang>.json`
  (см. поле `modules.*.id`). Для утилитарного слоя (`src/utils/**`,
  не привязанного к фиче) — префикс `00`.
- `sub` / `subsub` — порядковые номера внутри фичи или утилитарного
  домена. Не пересекаются между волнами: B-1 = `00.6.1.*`,
  B-2 = `00.6.2.*`, и т.д.
- `case` — двузначный номер (01, 02, …). Не переиспользуется в
  пределах одной пары `sub.subsub`.

Пример:

```typescript
it('00.6.1#03 should handle multi-char cyrillic and preserve unmapped ь/ъ', () => {
```

**Кросс-модульный кейс** дополнительно помечается списком `+id`:

```typescript
it('00.6.2#15 (+3, +5) should drive InlineAnnotation_Make_AnchorId for abbr/term', () => {
```

Смысл: «этот тест провалится, если сломается фича 3 или 5».

### 1.2. Импорты в тестах

Все `import` — из `@jest/globals`:

```typescript
import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TestSubject } from './TestSubject.ts';
import type { TestTypes } from './TestTypes.ts';
```

**Cross-module `require` — в шапке файла, не внутри `it`:**

```typescript
// правильно
const { buildFigureId } = require('../../plugins/utils/md.links.figure');

describe('...', () => {
    it('...', () => {
        expect(buildFigureId('x')).toBe('fig-x');
    });
});

// неправильно — теряется при перемещении модуля, шумит в diff
it('...', () => {
    const { buildFigureId } = require('../../plugins/utils/md.links.figure');
    // ...
});
```

### 1.3. Frozen snapshot, не «живой источник»

**Не** пишем parity-тесты, читающие живой legacy-файл через
`readFileSync` + `extractFunction`. После миграции файл становится
shim'ом, и сравнение вырождается в самосравнение.

Правильно — **frozen snapshot**: зафиксировать эталон **до** миграции,
закоммитить литералы. После миграции — тот же тест становится
drift-guard'ом:

```typescript
describe('MyModule frozen snapshot (legacy migrated)', () => {
    const cases: Array<[string, string]> = [
        ['Привет', 'privet'],
        ['жизнь', 'zhizn'],           // trailing ь
        ['объект', 'ob_ekt'],          // middle ъ → separator
    ];

    it('00.X.Y#99 should keep frozen legacy output', () => {
        for (const [input, expected] of cases) {
            expect(MyModule.method(input)).toBe(expected);
        }
    });
});
```

### 1.4. Структура тестового файла

Колокация: `Foo.ts` рядом с `Foo.test.ts`. Устаревшие заглушки
`test/**/*.test.js` (`toBeDefined` + `todo`) — кандидаты на удаление
при касании.

Порядок `describe`-блоков:

1. Основной контракт (`basics`, `separator normalisation`, `cyrillic`).
2. Edge-cases (`empty`, `non-string`, `whitespace-only`, `longest match`).
3. Cross-module invariants (с метками `+id`).
4. Frozen snapshot.

### 1.5. Что не пишем

- `test.todo(...)` — либо кейс, либо удалить.
- `expect(...).toBeDefined()` как единственная проверка — не контракт.
- `expect(...).not.toBeNull()` без конкретного `toBe(...)` — не защита.
- Хардкод конкретного сообщения об ошибке — тест должен падать на
  логике, не на формулировке.
- Импорт модулей, зависящих от `vscode`, из тестов утилит
  (`src/utils/**`). `vscode` доступен только в extension host; в Node —
  `Cannot find module`. Тесты утилит не должны тянуть команды/UI.

### 1.6. Проверка закоммиченности `.test.ts`

```bash
git ls-files | grep '\.test\.ts$' | wc -l
find src -name '*.test.ts' | wc -l
```

Числа должны совпадать. Иначе — `git add` перед коммитом рефакторинга.

---

## 2. TypeScript в JS-проекте

Проект написан на `.js` с `checkJs: true`. `.ts`-файлы подключаются
постепенно, волнами.

### 2.1. `require` в JS-потребителе

Всегда **с расширением** `.ts`, иначе esbuild не резолвит:

```javascript
// правильно
const { String_Compare_Natural } = require('../../utils/string/String_Compare_Natural.ts');

// неправильно
const { String_Compare_Natural } = require('../../utils/string/String_Compare_Natural');
```

`tsconfig.json` содержит `allowImportingTsExtensions: true` при
`noEmit: true` — валидный сценарий.

### 2.2. `import` внутри `.ts`

**С явным расширением.** Этого требует нативный Node 24
(strip-types + ESM resolver). Extensionless `import ... from './X'`
пропускают ts-jest и esbuild, но `node ./plugins/X.js` падает с
`ERR_MODULE_NOT_FOUND`.

Правила:

- собственный `.ts`-модуль → `.ts`:
  ```typescript
  import { String_Transliterate_Cyrillic } from '../string/String_Transliterate_Cyrillic.ts';
  ```
- legacy CJS `.js`-модуль → `.js`:
  ```typescript
  import { slugify_latin_alphanumeric } from '../encoding.slugify.js';
  ```
- внешние пакеты (`node:fs`, `js-yaml`) → без расширения:
  ```typescript
  import * as fs from 'node:fs';
  import yaml from 'js-yaml';
  ```

**Многострочные импорты** — расширение на последней строке:

```typescript
import {
    FeatureMap_Filter_Engine,
    type ChipAttrs,
} from './FeatureMap_Filter_Engine.ts';
```

**Директорные импорты** (`from '.'`) — не работают под нативным Node:

```typescript
// неправильно
import { run } from '.';

// правильно
import { run } from './index.ts';
```

Правило действует **на все `.ts`-файлы**, включая `.test.ts`. Тесты
запускаются через ts-jest (терпит extensionless), но если скопировать
такой импорт в production — CLI упадёт.

Проверка:

```bash
git grep -nE "from '\.[^162]*'" -- 'src/**/*.ts' | grep -vE "\.(ts|js)'"
# должно быть пусто
```

**Известный warning:** `MODULE_TYPELESS_PACKAGE_JSON` при
`node ./plugins/X.js`. Причина — `package.json` без `"type"`. Не
фиксить через `"type": "module"` (сломает `.js` с `require`). Плановое
решение — CLI-A (прекомпиляция `.ts` → `.js`).

### 2.3. `__dirname` в `.ts`

`__dirname` под нативным Node 24 в `.ts` **не определён** (модуль
грузится как ESM через `loadESMFromCJS`). ts-jest это маскирует, но
`node ./plugins/X.js` падает с `ReferenceError`.

`import.meta.url` **нельзя** при `tsconfig.module: "commonjs"` — TS
выдаёт ошибку компиляции.

**Правило:** `.ts`-модули, которым нужен путь к себе, получают его
**извне** (`process.env` / параметр функции / `opts`). Путь задаётся в
CJS-точке входа, где `__dirname` работает.

Пример: `_paths.ts` читает `process.env.DOCS_PROJECT_ROOT`, который
ставит `diplodoc-helper-cli.js` в prelude через `findProjectRoot(__dirname)`.

### 2.4. Типы для «словарей» и «массивов объектов»

Любая функция, возвращающая `{}` или `[]`, которая используется из
другого модуля, обязана иметь типизацию. Правило:

- `Foo.types.ts` в папке модуля;
- JSDoc в legacy-файле ссылается на него:
  `/** @typedef {import('./Foo.types.ts').FooMap} FooMap */`
- TS-тест импортирует через `import type { FooMap } from './Foo.types.ts';`

Пример:

```typescript
// gosts.types.ts
export type GostRefs = Record<string, GostRef[]>;

// gosts.collector.js
/** @type {GostRefs} */
const refs = {};

// gosts.collector.test.ts
import type { GostRefs } from './gosts.types.ts';
```

Без типизации `const refs = {}` в `.js` даёт `{}` в `checkJs`, и
`refs['key']` падает с `"key" не может использоваться для индексации`.

### 2.5. `catch (e)`

При `checkJs` / `strict` `e` имеет тип `unknown`:

```javascript
} catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[module] ${msg}`);
}
```

### 2.6. Где живут `.ts`-модули

| Папка                          | Что                                                |
| ------------------------------ | -------------------------------------------------- |
| `src/utils/string/`            | `String_*`                                         |
| `src/utils/url/`               | `Url_Transform_*`, `String_Transliterate_Cyrillic` |
| `src/utils/html/`              | `Html_Escape_*`, `Html_Classify_File`              |
| `src/utils/fs/`                | `Fs_Walk_Directory`, `Fs_Find_Module_Dirs`         |
| `src/utils/link/`              | `Link_Classify_External`                           |
| `src/utils/inline-annotation/` | `InlineAnnotation_*`                               |
| `src/utils/path/`              | `Path_ToPosix`                                     |
| `src/utils/frontmatter/`       | `Frontmatter_Split_Raw`                            |

Тип-файлы: `Foo.types.ts` **в папке модуля-хозяина** (`src/plugins/gosts/gosts.types.ts`),
не в `src/utils/types/`.

### 2.7. CLI-флаги до `require` (prelude)

Флаги, влияющие на `_paths.ts` (сейчас — `--docs-project-root`), нужно
разбирать в prelude `diplodoc-helper-cli.js` **до** первого `require`.
`_paths.ts` кешируется Node'ом и читает `process.env` однократно.

Поддерживай обе формы:

```js
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--flag='))        { ... = a.slice('--flag='.length); argv.splice(i, 1); break; }
    if (a === '--flag' && argv[i + 1])  { ... = argv[i + 1];               argv.splice(i, 2); break; }
}
```

Первая форма (`--key=value`) коварна: `argv.indexOf('--flag')` её не находит.

### 2.8. `require.main === module` в `.ts` не работает

Под нативным Node 24, где `.ts` грузится как ESM, `require` и `module` —
undefined. Правило: **не использовать `require.main === module` в `.ts`**.
CLI-entry — единственная точка входа `diplodoc-helper-cli.js`.

### 2.9. `.default` на CJS-модуле — всегда `undefined`

```js
// правильно
const { runRenderModules } = require('./render-modules');
// неправильно
require('./render-modules').default.runRenderModules;  // TypeError
```

`.default` появляется только у ESM (`export default`) или CJS с явным
`module.exports = { default: {...} }`. ts-jest иногда маскирует это
через interop, но `require()` возвращает сырой `module.exports`.

---

## 3. Именование модулей

Формат: **`<Object>_<Action>_<Subject>`**.

- `Object` — что примеряет на себя действие;
- `Action` — глагол (`Compare`, `Transform`, `Escape`, `Classify`, `Walk`);
- `Subject` — что обрабатывается.

Класс-статика:

```typescript
export class Url_Transform_Segment {
    static slugify(text: unknown): string { /* ... */ }
}
```

**Почему класс, а не функция:** группировка по `Object`,
автодополнение в IDE, единая точка для JSDoc-контракта, отсутствие
конфликтов имён при импорте нескольких `slugify` из разных доменов.

**Суффикс `Legacy`** — если функция реализует лоссовый/сомнительный
контракт, но оставлен для совместимости:
`String_Transliterate_Cyrillic.fromLatinLegacy(...)` + `@deprecated`.

### 3.1. `Orchestrant`

Если метод сам по себе сложный и декомпозирован, но публичный фасад
один — он называется `<Action>Orchestrant` (или `<Action>` без суффикса),
внутренние — `<Action>Step<N>`.

---

## 4. Миграционная волна

5 шагов. Не пропускать.

### Шаг 1. Frozen snapshot на legacy

Пишем тесты **на текущем `.js`**. Все зелёные. Фиксируем эталон.

### Шаг 2. Типы

Создать `Foo.types.ts`. `const X = {}` → JSDoc `@type {FooMap}`.
`tsc --noEmit` — чисто.

### Шаг 3. Миграция

Заменить реализацию. Оставить shim-обёртку:

```javascript
/**
 * @deprecated Импортируйте `Foo` напрямую.
 * Shim сохранён до конца волны <N> для минимального диффа в потребителях.
 *
 * Regression: 00.X.Y#<first>..#<last>.
 */
const oldFunctionName = Foo.staticMethod;
```

### Шаг 3.5. После `git mv X.js X.ts` — заменить тело целиком

`git mv` переименовывает, но **не** меняет содержимое. В `.ts`-файле
остаётся CJS-тело с `require(...)` и `module.exports`. Проверка:

```bash
grep -nE "module\.exports|^const .* = require\(" src/**/X.ts
```

Если найдено — тело не заменено. Симптом: `TS2306: File is not a module`.

### Шаг 3.6. `runXxx(argv)` не вызывает `process.exit`

Функции, которые тестируются (`runCollectCatalog`, `runEmitFeatureMap`,
`runRenderModules`, …), **бросают `Error`**. `process.exit` — только
в CLI-entry:

```javascript
if (require.main === module) {
    runXxx(process.argv.slice(2)).catch(e => {
        console.error(`❌ ${e.message || e}`);
        process.exit(1);
    });
}
```

Причина: `process.exit` убивает Jest-worker. Тест видит
`Jest worker encountered N child process exceptions` вместо `expect().rejects`.

### Шаг 4. Прогон

`npm test -- Foo` → зелёные. Затем `npm test` целиком.

### Шаг 5. Удаление shim

Отдельный коммит. Перед удалением — `git grep` по имени функции.

### Правила волны

- **Не смешивать** в одном коммите миграцию A и B.
- **Не смешивать** миграцию и новую фичу.
- **Не удалять** legacy до зелёного snapshot после миграции всех потребителей.

---

## 5. Асимметрии legacy, которые нельзя «оптимизировать»

### 5.1. Коллекторы: 4 независимых флага

| Коллектор  | `skipHidden` | `skipUnderscore` | `skipDirNames` | `skipFullPaths` |
| ---------- | ------------ | ---------------- | -------------- | --------------- |
| `abbrs`    | ✓            | ✓                | 6 имён         | ✓ output-dir    |
| `terms`    | ✓            | ✓                | 6 имён         | ✓ output-dir    |
| `gosts`    | ✓            | ✓                | —              | ✓ output-dir    |
| `helptags` | ✗            | ✗                | 2              | —               |
| `сontexts` | ✗            | ✗                | 1              | —               |
| `figures`  | ✗            | ✗                | 3              | —               |

**Копирование шаблона между коллекторами = тихая регрессия.**

### 5.2. Slugify family: 4 функции, 4 контракта

| Функция                      | Транслит | Lowercase | Разделитель    | Сохраняет          | Trim             |
| ---------------------------- | -------- | --------- | -------------- | ------------------ | ---------------- |
| `slugify_latin_alphanumeric` | ✓        | ✓         | `_`            | `[a-z0-9]`         | ✓                |
| `slugify_filename`           | ✗        | ✗         | `_`            | `[\p{L}\p{N}\-._]` | ✓                |
| `slugify_diplodoc_reference` | ✓        | ✓         | `-`            | `[a-z0-9/=\ \-]`   | ✗ (trailing `-`) |
| `slugify_latin`              | ✓        | ✓         | `/` (сегменты) | всё, по сегментам  | ✗                |

Нельзя схлопнуть в один модуль с параметром `mode`.

### 5.3. Другие унаследованные контракты

- `Html_Escape_Text.escape` — **не** экранирует `'`.
- `Html_Escape_JsonString.escape` — **не** экранирует `&`.
- `String_Transliterate_Cyrillic.toLatin` — **не** транслитерирует `ь`/`ъ`.
- `slugify_latin_alphanumeric('жизнь')` → `'zhizn'` (trailing `ь` съедается `_` + trim), но `'объект'` → `'ob_ekt'` (middle `ъ` → separator).
- `Frontmatter_Split_Raw.split('---\n---\nbody')` → `null` (пустой frontmatter не матчится legacy-регексом).

---

## 6. Feature-map: особый случай

`feature-map` — отдельный цикл. Подробности — `FEATURE-MAP.md`.

Покрытие тестами:

| Модуль                                         | Кейсы            |
| ---------------------------------------------- | ---------------- |
| `emit-feature-map/index.ts`                    | `57.1#01..#18`   |
| `emit-feature-map/feature-map.injector.ts`     | `57.2#01..#03`   |
| `emit-feature-map/FeatureMap_Filter_Engine.ts` | `57.3#01..#29`   |
| `index.ts` (alt-project)                       | `57.4#01..#09`   |
| `index.ts` (path overrides)                    | `57.5#01..#03`   |
| `collect-catalog` (layout/path/empty)          | `57.6#01..#39`   |
| `emit-modules-table`                           | `00.6.7#01..#09` |
| `render-modules`                               | `00.6.8#01..#13` |
| `build-page-legend`                            | `00.6.6#01..#12` |
| `_layout`                                      | `00.4.4#01..#16` |

**Константы для тестов** — в `const FM = {...}` в шапке. При изменении
пути вывода / anchor / измерений / i18n — правится только этот блок.

**Три способа переопределить пути:**

1. `--docs-project-root=<root>` — глобально, через `process.env.DOCS_PROJECT_ROOT`.
   Predule-обработка (см. §2.7).
2. `--docs-root=<docs-dir>` — точечно, через `opts.docsDir` в `runEmitFeatureMap` /
   `runCollectCatalog` / `runEmitModulesTable` / `runRenderModules` /
   `runBuildPageLegend`.
3. `--generated-dir=<gen-dir>` — точечно, через `opts.generatedDir`.

Приоритет: `opts.*` > `_paths.ts` (env или дефолт).

---

## 7. Сборка и валидация

- `npm test` — Jest.
- `npm run type-check` — `tsc --noEmit` (JS + TS).
- `npm run validate` — `lint + type-check + test`.
- `npm run build:prod` — `generate-manifest + esbuild` → `dist/extension.js`.

`npm run precompile` гоняет `validate` перед сборкой.

### 7.1. `docs/plugins/` — зеркало, не источник правды

`installScripts` копирует `src/plugins/` в `docs/plugins/`. Правила:

- Jest не должен туда заходить → `testPathIgnorePatterns: ['<rootDir>/docs/']`;
- `tsc --noEmit` туда не заходит → `tsconfig.json#include` содержит
  только `src/**/*.js` + `global.d.ts`;
- `node ./plugins/X.js` из `docs/` работает (нативный Node 24+);
- при правке `src/plugins/**` — `docs/plugins/**` **не синхронизируется
  автоматически**. Переустановить через `installScripts` (`.test.ts` в
  ignore-листе);
- тесты в `docs/plugins/` не запускаются — могут тянуть `vscode`.

---

## 8. Что делать при обнаружении бага legacy

1. **Не чинить в текущей волне.**
2. Зафиксировать в frozen-snapshot (текущее поведение, включая баг).
3. Открыть отдельную задачу `chore(<module>): fix legacy <что>`.
4. Чинить отдельным коммитом с обновлением snapshot и явной
   пометкой в CHANGELOG как **breaking change**.

---

## 9. Полезные команды

```bash
# Внешние потребители функции
git grep -n "functionName\b" -- ':!<файл-определения>'

# Словарные литералы без типизации (кандидаты на *.types.ts)
git grep -n 'const \w* = {}' src/plugins/

# Extensionless relative imports в .ts
git grep -nE "from '\.[^162]*'" -- 'src/**/*.ts' | grep -vE "\.(ts|js)'"

# Случаи slugify-семейства
git grep -nE "slugify_(latin|latin_alphanumeric|filename|diplodoc_reference)" src/

# .test.ts не закоммичены
git ls-files | grep '\.test\.ts$' | wc -l
find src -name '*.test.ts' | wc -l

# Проверить, что docs-registry полностью .ts
find src/plugins/docs-registry -name '*.js'
# ожидаем: только feature-map/feature-map.client.js

# `__empty__` — grep по месту использования
git grep -n "__empty__" src/
```

---

## 10. Feature-map расширения

### 10.1. `__empty__` — «Без значения»

Служебный slug для модулей без значения измерения. Управляется в
`layout.json`:

```json
{
    "includeEmpty": true,
    "emptyLabel": { "content_type": "Без типа", "audience": "Без АРМ" }
}
```

- `includeEmpty: false` (default) — не включать;
- `includeEmpty: true` — для всех измерений;
- `includeEmpty: ["content_type", "status"]` — только для перечисленных.

`emptyLabel` — `string` (общий) или `object` (per-dim). Default: `'Без значения'`.

### 10.2. `strictDimensions: false` — auto-register

Неизвестные slug'и в измерениях:

- `true` (default): `throw` при первом unknown (с `--lenient` — warning);
- `false`: warning + auto-register в runtime (`catalog.dimensions`),
  `dimensions.yaml` не изменяется.

Для MES `strictDimensions: false` — реестр измерений не полный список.

### 10.3. `_fields.yaml` — `source: path`

Не все поля техпис пишет в frontmatter. Для path-based:

```yaml
fields:
  section:
    kind: multi
    dimension: section
    dimField: sections
    source: path
    path:
      regex: "Раздел(\\d+)"
      template: "s$1"

  audience:
    kind: multi
    dimension: audience
    dimField: audiences
    source: path
    path:
      rules:
        - { regex: "АРМ\\s*Менеджера", slug: "manager" }
        - { regex: "АРМ\\s*Технолога", slug: "technologist" }
```

- `source: 'frontmatter'` (default) — из `fm[frontmatterKey || key]`;
- `source: 'path'` — из `mod.dir` через regex/rules;
- `source: 'frontmatter-or-path'` — frontmatter приоритетнее, path как fallback.

### 10.4. `data-attrs` и `data-dims`

Единственный контракт для браузерного клиента:

```html
<div data-feature-map data-dims="audience,status,section,content_type">
  <a class="fm-chip" data-attrs='{"audience":["manager"],"section":["s1"]}'
     data-module="…" title="…">ident</a>
</div>
```

- `data-dims` на root — объединение `stripDimensions ∪ {rowDimension, columnDimension}`;
- `data-attrs` — JSON-объект `{dim: string[]}` на каждом чипе;
- legacy `data-actor` / `data-cap` / `data-family` / `data-layer` — удалены.

## 11. Pipeline и `plugins.config.yaml`

### 11.1. Три источника конфигурации

| Приоритет | Источник                            | Кто использует  |
| --------- | ----------------------------------- | --------------- |
| 1         | `--config=<path>`                   | CI / Docker     |
| 2         | `PLUGINS_CONFIG_PATH` env           | shell-wrapper   |
| 3         | `<projectRoot>/plugins.config.yaml` | локально техпис |
| 4         | `DEFAULT_PIPELINE` (код)            | back-compat     |

`<projectRoot>` — walk up to first `package.json`. Техписский конфиг — только «для работы с документацией»; destructive-операции (FM, ГОСТы) — в `<repo>/ci/plugins.config.yaml`.

### 11.2. Три уровня + merge

4 уровня опций, специфичное доминирует:

- **L2** — `stages.<phase>[].options` — для конкретного плагина в общем yaml;
- **L1** — `common` — для всех плагинов;
- **L3** — `<pluginDir>/plugin.config.{yaml,yml,json}` — свой конфиг плагина (dev override: `src/plugins/<name>/` > `plugins/<name>/`);
- **L4** — `ModuleDef.args[].default` — дефолт в коде (deprecated, уйдёт в Wave 5).

**Приоритет:** L2 > L1 > L3 > L4.

Почему L1 > L3: если в коде FM забыл выключить debug, но в общем yaml явно `off` — работает. L2 > L3: явное решение в yaml проекта доминирует над dev-забывчивостью.

### 11.3. `logLevel` и `stopOnError`

| Опция         | Значения                             | Default | Где    |
| ------------- | ------------------------------------ | ------- | ------ |
| `logLevel`    | `off` / `info` / `warning` / `error` | `off`   | L1–L4  |
| `stopOnError` | `true` / `false`                     | `true`  | L1, L2 |

- `stopOnError` — свойство pipeline.runner: при `throw` от модуля → `continue` или stop;
- `logLevel` — передаётся модулю через `opts.logLevel`. **На Wave 5 только данные** — `console.log` работает как раньше. Реальное использование — Wave 5+ (`opts.logger`).
- `verbose` — **deprecated** в пользу `logLevel`.

### 11.4. Порядок = порядок в YAML

`ModuleDef.defaultOrder` — только suggestion для `init-config`. В runtime порядок **буквальный** = порядок элементов в `plugins.config.yaml`. Никакого topo-sort. Если нужно поменять — переставить две строки.

`dependsOn` — только для `init-config` validation (warn). Runtime не падает на отсутствующей зависимости.

### 11.5. Fallback strategy

`docs-build.js` и `run-pipeline` работают параллельно до Wave 5+:

```json
"build":          "node ./plugins/docs-build.js",
"build:pipeline": "node ./plugins/run-pipeline.js --stage=all"
```

Пока `plugins.config.yaml` нет — `run-pipeline` использует `DEFAULT_PIPELINE` (текущий `docs-build.js`). Deprecation `docs-build.js` — отдельной волной после Wave 5.

### 11.6. `init-config`

```bash
diplodoc-helper-cli init-config [--project-root=<path>] [--dry-run] [--force] [--only=<list>] [--lang=<code>]
```

- default — не трогать существующие;
- `--dry-run` — отчёт;
- `--force` — перезаписать;
- `--only=layout,fields` — ограничить набор;
- эвристики: `АРМ X` → path-based `audience`, `РазделN` → path-based `section`, `ГОСТы/` → `gosts` включён, `known-issues-summary.json` → `jsonToMd` включён.

### 11.7. `jsonToMd` — исключение

14 специфичных аргументов. В `ModuleDef.args` — flat, но в `plugins.config.yaml` для этого модуля — `options: { ... }` как escape hatch. Если появится 3-й модуль с >10 специфичных — правило пересмотрим.