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

**Кросс-модульный кейс** (тест на стык фич) дополнительно помечается
списком `+id` в начале `it`:

```typescript
it('00.6.2#15 (+3, +5) should drive InlineAnnotation_Make_AnchorId for abbr/term', () => {
```

Смысл метки: «этот тест провалится, если сломается фича 3 или 5, а не
только 00». Помогает при триаже падений.

### 1.2. Импорты в тестах

Все `import` — из `@jest/globals`, без глобалов:

```typescript
import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TestSubject } from './TestSubject';
import type { TestTypes } from './TestTypes';
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

Исключение — `require` внутри `it` оправдан только для `jest.isolateModules`
или `jest.resetModules`. В обычном коде — в шапку.

### 1.3. Frozen snapshot, не «живой источник»

**Не** пишем parity-тесты, которые читают живой legacy-файл через
`readFileSync` + `extractFunction`. После миграции файл становится
shim'ом, и сравнение вырождается в самосравнение — тест зелёный, но
ничего не защищает.

Правильно — **frozen snapshot**: зафиксировать эталонные значения
литералами **до** миграции, закоммитить их. После миграции тот же тест
становится drift-guard'ом:

```typescript
describe('MyModule frozen snapshot (legacy migrated)', () => {
    const cases: Array<[string, string]> = [
        ['Привет', 'privet'],
        ['жизнь', 'zhizn'],           // trailing ь
        ['объект', 'ob_ekt'],          // middle ъ → separator
        // ...
    ];

    it('00.X.Y#99 should keep frozen legacy output', () => {
        for (const [input, expected] of cases) {
            expect(MyModule.method(input)).toBe(expected);
        }
    });
});
```

Один раз прочитал источник, зафиксировал, дальше — только литералы.

### 1.4. Структура тестового файла

Колокация: `Foo.ts` рядом с `Foo.test.ts` (не в `test/`).
Устаревшие заглушки `test/**/*.test.js` (`toBeDefined` + `todo`) —
кандидаты на удаление при касании.

Порядок `describe`-блоков:

1. Основной контракт (`basics`, `separator normalisation`, `cyrillic`, …).
2. Edge-cases (`empty`, `non-string`, `whitespace-only`, `longest match`).
3. Cross-module invariants (с метками `+id`).
4. Frozen snapshot в конце.

### 1.5. Что не пишем

- `test.todo(...)` — либо кейс, либо удалить.
- `expect(...).toBeDefined()` как единственная проверка — не контракт.
- `expect(...).not.toBeNull()` без конкретного `toBe(...)` — не защита.
- Хардкод конкретного сообщения об ошибке — тест должен падать на
  логике, не на формулировке.

---

## 2. TypeScript в JS-проекте

Проект написан на `.js` с `checkJs: true`. `.ts`-файлы подключаются
постепенно, волнами.

### 2.1. `require` в JS-потребителе

Всегда **с расширением** `.ts`, иначе сборка через esbuild не резолвит:

```javascript
// правильно
const { String_Compare_Natural } = require('../../utils/string/String_Compare_Natural.ts');

// неправильно — esbuild не найдёт
const { String_Compare_Natural } = require('../../utils/string/String_Compare_Natural');
```

`tsconfig.json` содержит `allowImportingTsExtensions: true` при
`noEmit: true` — это валидный сценарий.

### 2.2. `import` внутри `.ts`

**Без** расширения — `ts-jest` и TypeScript резолвят сами:

```typescript
// правильно
import { String_Transliterate_Cyrillic } from '../string/String_Transliterate_Cyrillic';

// неправильно
import { ... } from '../string/String_Transliterate_Cyrillic.ts';
```

### 2.3. Типы для «словарей» и «массивов объектов»

Любая функция, возвращающая `{}` или `[]`, которая используется из
другого модуля (в т.ч. из теста), обязана иметь типизацию. Правило:

- Есть отдельный `Foo.types.ts` в папке модуля.
- JSDoc в legacy-файле ссылается на него:
  `/** @typedef {import('./Foo.types.ts').FooMap} FooMap */`
- TS-тест импортирует через `import type { FooMap } from './Foo.types';`

Пример (`gosts`):

```typescript
// gosts.types.ts
export type GostRefs = Record<string, GostRef[]>;

// gosts.collector.js
/** @type {GostRefs} */
const refs = {};

// gosts.collector.test.ts
import type { GostRefs } from './gosts.types';
const refs: GostRefs = collectGostReferences(langDir, gostList);
```

**Без типизации** `const refs = {}` в `.js` даёт `{}` в `checkJs`,
и `refs['key']` падает с `"key" не может использоваться для индексации`.

### 2.4. `catch (e)`

В `.js` при `checkJs` / `strict` `e` имеет тип `unknown`. Правильно:

```javascript
} catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[module] ${msg}`);
}
```

Не `e.message` напрямую.

### 2.5. Где живут `.ts`-модули

Категорийные папки в `src/utils/`:

| Папка                          | Что                                              |
| ------------------------------ | ------------------------------------------------ |
| `src/utils/string/`            | `String_*` — сравнение, обрезка, форматирование  |
| `src/utils/url/`               | `Url_*` — slugify, транслитерация, encode        |
| `src/utils/html/`              | `Html_*` — escape, классификация, parse          |
| `src/utils/fs/`                | `Fs_*` — walk, cleanup                           |
| `src/utils/link/`              | `Link_*` — классификация ссылок                  |
| `src/utils/markdown/`          | `Markdown_*` — парсинг, маскировка               |
| `src/utils/inline-annotation/` | `InlineAnnotation_*` — общий код для abbrs/terms |
| `src/utils/path/`              | `Path_*` — resolve, classify                     |
| `src/utils/yaml/`              | `Yaml_*` — load, save                            |
| `src/utils/frontmatter/`       | `Frontmatter_*` — parse, get, upsert             |

Тип-файлы: `Foo.types.ts` **в папке модуля-хозяина** (`src/plugins/gosts/gosts.types.ts`),
не в `src/utils/types/`.

---

## 3. Именование модулей

Формат: **`<Object>_<Action>_<Subject>`**.

- `Object` — что примеряет на себя действие (существительное-субъект).
- `Action` — глагол (`Compare`, `Transform`, `Escape`, `Classify`, `Walk`).
- `Subject` — что обрабатывается (`Natural`, `Segment`, `Text`, `File`).

Класс-статика, а не функции:

```typescript
export class Url_Transform_Segment {
    static slugify(text: unknown): string { /* ... */ }
}
```

Потребители вызывают `Url_Transform_Segment.slugify(x)`.

**Почему класс, а не функция:** группировка по `Object`, автодополнение
в IDE, единая точка для JSDoc-документации контракта, отсутствие
конфликтов имён при импорте нескольких `slugify` из разных доменов.

**Почему `static`, а не instance:** нет состояния, нет смысла в `new`.

**Почему `Object_Action_Subject`, а не `ObjectSubjectAction`:** в
алфавитном порядке файлов `Url_Transform_Filename`, `Url_Transform_Reference`,
`Url_Transform_Segment` идут подряд — удобно навигировать.

**Суффикс `Legacy`** — если функция реализует лоссовый/сомнительный
контракт, но оставлен для совместимости:
`String_Transliterate_Cyrillic.fromLatinLegacy(...)` + `@deprecated`.

### 3.1. `Orchestrant`

Если метод сам по себе сложный и декомпозирован на несколько
приватных/публичных, но публичный фасад один — он называется
`<Action>Orchestrant` или `<Action>` (без суффикса), а внутренние —
`<Action>Step<N>`.

Пример из планируемого `Markdown_Parse_Figure_Orchestrant`:
`extractImages` → `extractFigcaptions` → `associateCaptions` → orchestrant.

---

## 4. Миграционная волна

Каждая волна миграции `.js` → `.ts` проходит 5 шагов. Не пропускать.

### Шаг 1. Frozen snapshot на legacy

До того как трогать код, пишем тесты **на текущем `.js`**. Все зелёные.
Это фиксирует эталон поведения.

### Шаг 2. Типы

Создать `Foo.types.ts` в папке модуля. Если `const X = {}` — JSDoc
`@type {FooMap}`. Запустить `tsc --noEmit` — должно быть чисто.

### Шаг 3. Миграция

Заменить реализацию. Оставить shim-обёртку в старом файле:

```javascript
/**
 * @deprecated Импортируйте `Foo` напрямую.
 * Shim сохранён до конца волны <N> для минимального диффа в потребителях.
 *
 * Regression: 00.X.Y#<first>..#<last>.
 */
const oldFunctionName = Foo.staticMethod;
```

### Шаг 4. Прогон

`npm test -- Foo` → зелёные. Затем `npm test` целиком.

### Шаг 5. Удаление shim

Отдельный коммит. Не совмещать с миграцией потребителей. Перед
удалением — `git grep` по имени функции (может остаться внешний
потребитель, например, установленные скрипты в целевом проекте).

### Правила для волны

- **Не смешивать** в одном коммите миграцию A и миграцию B.
- **Не смешивать** миграцию и новую фичу (например, изменение
  `feature-map` не должно ехать в волне `InlineAnnotation_*`).
- **Не удалять** legacy до тех пор, пока snapshot не зелёный **после**
  миграции всех потребителей.

---

## 5. Асимметрии legacy, которые нельзя «оптимизировать»

Эти вещи выглядят как дубли или как баги, но менять их = breaking
change для существующих документов и/или внешних потребителей. Все
зафиксированы frozen-снапшотами.

### 5.1. Коллекторы: 4 независимых флага

| Коллектор  | `skipHidden` | `skipUnderscore` | `skipDirNames`                                  | `skipFullPaths` |
| ---------- | ------------ | ---------------- | ----------------------------------------------- | --------------- |
| `abbrs`    | ✓            | ✓                | `abbrs,terms,contexts,helptags,figures,roadmap` | ✓ output-dir    |
| `terms`    | ✓            | ✓                | `terms,abbrs,contexts,helptags,figures,roadmap` | ✓ output-dir    |
| `gosts`    | ✓            | ✓                | —                                               | ✓ output-dir    |
| `helptags` | ✗            | ✗                | `helptags,contexts`                             | —               |
| `сontexts` | ✗            | ✗                | `contexts`                                      | —               |
| `figures`  | ✗            | ✗                | `figures,contexts,helptags`                     | —               |

**Копирование шаблона между коллекторами = тихая регрессия.**
`skipHidden: true` в `helptags` потеряет теги из `.hidden/`-статей;
`skipDirNames` из 6 имён в `figures` потеряет рисунки в `abbrs/terms/roadmap`.

### 5.2. Slugify family: 4 функции, 4 разных контракта

| Функция                      | Транслит | Lowercase | Разделитель    | Сохраняет            | Trim             |
| ---------------------------- | -------- | --------- | -------------- | -------------------- | ---------------- |
| `slugify_latin_alphanumeric` | ✓        | ✓         | `_`            | `[a-z0-9]`           | ✓                |
| `slugify_filename`           | ✗        | ✗         | `_`            | `[\p{L}\p{N}\-._]`   | ✓                |
| `slugify_diplodoc_reference` | ✓        | ✓         | `-`            | `[a-z0-9/=\ \-]`     | ✗ (trailing `-`) |
| `slugify_latin`              | ✓        | ✓         | `/` (сегменты) | всё, но по сегментам | ✗                |

**Нельзя** схлопнуть в один модуль с параметром `mode`. Каждый
контракт используется в своей фиче, у каждого — свой frozen-snapshot.
`slugify_filename` сохраняет кириллицу — это требование, а не упущение.

### 5.3. Другие унаследованные контракты

- `escapeHtml` / `Html_Escape_Text.escape` — **не** экранирует `'`.
  Использование в одинарных кавычках (`id='${x}'`) — небезопасно и
  не поддерживается.
- `Html_Escape_JsonString.escape` — **не** экранирует `&` (уже
  экранирован `Html_Escape_Text` на предыдущем шаге).
- `String_Transliterate_Cyrillic.toLatin` — **не** транслитерирует
  `ь`/`ъ`, они «протекают» как есть. Очистка до `[a-z0-9]` — дело
  `Url_Transform_*`.
- `slugify_latin_alphanumeric('жизнь')` → `'zhizn'` (trailing `ь`
  съедается `_` + trim), но `slugify_latin_alphanumeric('объект')`
  → `'ob_ekt'` (middle `ъ` → separator).
- `slugify_diplodoc_reference('### Header ###')` → `'header-'`
  (trailing `-`; на практике не проявляется, потому что caller уже
  `trim`'ит заголовок).

---

 ## 6. Feature-map: особый случай
 
`feature-map` — **не** в общем пайплайне миграций, у неё свой цикл
(FM-pre, FM-a..d). Причина: планируется поддержка другого проекта
(другие измерения, другие пути, другой набор статей). Любая правка
`feature-map.*` должна проверяться тестами по следующей схеме:

| Модуль                                         | Кейсы          | Что покрывают                                                                             |
| ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `emit-feature-map/index.js`                    | `57.1#01..#09` | генерация `feature-map.md` из `catalog.json`                                              |
| `emit-feature-map/feature-map.injector.js`     | `57.2#01..#03` | инжект CSS+JS в HTML-страницы сборки                                                      |
| `emit-feature-map/FeatureMap_Filter_Engine.ts` | `57.3#01..#27` | чистая логика фильтрации (attrsOf, computeChipClass, computeCellClass, computeVisibility) |

**Константы для тестов** — в `const FM = {...}` в шапке каждого тест-файла.
При изменении пути вывода, anchor'а, измерений или i18n — правится
только этот блок, тело тестов не трогается (см. Шаг 5 плана FM).

**Состояние FeatureMap_Filter_Engine:** reference implementation.
`feature-map.client.js` остаётся браузерным IIFE, его inline-функции
дублируют Engine (синхронизируются вручную до шага 3, где будет введён
esbuild-бандл). При любой правке inline-функций в `client.js` —
обновить Engine и прогнать `57.3.*`.

---

## 7. Сборка и валидация

- `npm test` — Jest (все `.test.ts` + `.test.js`).
- `npm run type-check` — `tsc --noEmit` (JS + TS).
- `npm run validate` — `lint + type-check + test`.
- `npm run build:prod` — `generate-manifest + esbuild` → `dist/extension.js`.

`npm run precompile` автоматически гоняет `validate` перед сборкой —
локальный `npm run build:prod` упадёт, если тесты красные. Это
намеренно.

---

## 8. Что делать при обнаружении бага legacy

1. **Не чинить в текущей волне.** Волна — про миграцию, баг — про
   отдельную фичу.
2. Зафиксировать в frozen-snapshot (зафиксировать **текущее**
   поведение, включая баг).
3. Открыть отдельную задачу: `chore(<module>): fix legacy <что>`.
4. Чинить отдельным коммитом с обновлением snapshot и явной
   пометкой в CHANGELOG как **breaking change**.

Пример: `slugify_filename('.hidden')` → `'.hidden'` (dot не trim'ится).
Если когда-нибудь решим trim'ить — сломаются файлы `docs/ru/**/Контексты/.hidden.md`,
все ссылки на них. Snapshot заставит пройти через это решение явно.

---

## 9. Полезные команды

```bash
# Проверить, есть ли внешние потребители функции
git grep -n "functionName\b" -- ':!<файл-определения>'

# Все словарные литералы без типизации (кандидаты на *.types.ts)
git grep -n 'const \w* = {}' src/plugins/

# Все места, где используется slugify-семейство
git grep -nE "slugify_(latin|latin_alphanumeric|filename|diplodoc_reference)" src/
```