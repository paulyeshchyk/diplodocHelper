---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `FrontMatterSectionTypesIndexed` включает `Page` — Page ошибочно учитывается

```js
if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
```

`FrontMatterSectionTypesIndexed = [Part, Section, Chapter, Page]`. `Page` — статья, у неё **нет** `sectionIndex` (`''` по определению). Проверка `&& sectionIndex` отсекает `Page` — потому что `sectionIndex === ''` (falsy). Так что **на практике** `Page` не учитывается.

Но если кто-то вручную поставит `sectionIndex: '5'` в статье (`sectionType: 'Page'`) — статья попадёт в `siblingIndices`, следующий `sectionIndex` станет `6`. «Фантомный» индекс.

Правильно — использовать `FrontMatterSectionTypesIndexed2` (без `Page`).

### Не учитывает дочерние секции второго уровня

`calculateNextIndex` смотрит только на **прямых** детей `targetDir`. Если `targetDir = docs/ru/` содержит:
- `Раздел1.Введение/` (`sectionIndex: '1'`), **и**
- `Раздел1.Введение/Глава1/` (`sectionIndex: '1.1'`),

— второй уровень **не** учитывается (обход `targetDir` только на один уровень). Это правильно для `parentIndex = ''` (дети первого уровня `[1]` → следующий `2`), но если пользователь создаёт **первую** главу в `Раздел1.Введение`, `maxIdx` берётся из `targetDir`-детей (только `Раздел1.Введение` с индексом `1`), а надо было бы из `Раздел1.Введение`-детей (пусто → `maxIdx = 0`).

Стоп — `targetDir = docs/ru/Раздел1.Введение`, `parentIndex = '1'`, обход детей `targetDir` (пусто), `maxIdx = 0`, возврат `'1.1'`. Правильно.

А если `targetDir = docs/ru/`, `parentIndex = ''`, обход детей `docs/ru/` (там `Раздел1` с `'1'`), `maxIdx = 1`, возврат `'2'`. Тоже правильно.

Глубже — работает, потому что каждый вызов идёт от **своего** родителя. Логика корректна.

### `maxIdx` — последняя часть, не полная

```js
const parts = sectionIndex.split('.');
const lastPart = parts[parts.length - 1];
const lastNum = parseInt(lastPart, 10);
```

Для `sectionIndex = '2.5'` — `lastNum = 5`. Для `sectionIndex = '2.5.3'` — `lastNum = 3`.

Если у детей **разные** уровни (например, `2.5` и `2.5.3` в одной папке — что нетипично, но возможно), `maxIdx = max(5, 3) = 5`. Следующий `2.5.6`? Нет, `2.6` — потому что `lastNum` берётся как «последний в строке», а не как «элемент того же уровня».

Это **баг для смешанных уровней**: если в `targetDir` есть `2.5` и `2.5.3`, ожидаемый следующий — `2.6` (по уровню), а не `2.5.6`. Работает «случайно» — если дети одного уровня (типичный случай), всё ок.

### `parentIndex === ''` — `'1'` (не `'0'`)

```js
if (!fs.existsSync(parentIndexPath)) return '1';
```

Если `targetDir` — корень языка (`docs/ru/` без `index.md` — норм для Diplodoc), `parentIndex = '1'` жёстко. Но если пользователь создаёт **вторую** секцию в `docs/ru/` (первая уже есть), `parentIndexPath = docs/ru/index.md` **существует**? Нет, обычно нет. Значит, `return '1'` — **не** `'2'`. Первая секция уже `'1'`, следующая тоже `'1'` — **коллизия**.

Стоп — `section.Create` (Фаза 2):

```js
const hasIndex = FrontMatterSectionTypesIndexed2.includes(sectionType.name);
const sectionIndexCalculated = calculateNextIndex(targetDir);
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
```

Если `targetDir = docs/ru/`, `calculateNextIndex` вернёт `'1'` (потому что `index.md` нет). Но если `docs/ru/Раздел1.Введение` уже существует с `sectionIndex: '1'`, `calculateNextIndex` **должен** вернуть `'2'`. А вернёт `'1'` (из-за раннего `return '1'`).

**Критический баг**: на корне языка `calculateNextIndex` **всегда** возвращает `'1'`. Не учитывает существующих детей. Пользователь получает предложение `'1'`, конфликтует с существующей секцией, `createSectionFolder` бросит «Путь уже существует».

Правильный код:

```js
let parentIndex = '';
if (fs.existsSync(parentIndexPath)) {
    const parentContent = fs.readFileSync(parentIndexPath, 'utf8');
    parentIndex = String(get(parentContent, 'sectionIndex') || '');
}
// … обход детей (без early return) …
```

То есть `parentIndex = ''` при отсутствии `index.md`, **но** обход детей всё равно выполняется.

### `parseInt` без `radix`

```js
const lastNum = parseInt(lastPart, 10);
```

Radix указан (`10`) — хорошо. Но `parseInt('05')` = `5`, `parseInt('5abc')` = `5`. Если `sectionIndex: '2.5abc'` (опечатка) — `lastNum = 5`, не диагностируется.

### `get` возвращает `null` при отсутствии

`get(content, 'sectionType')` — `null` если нет. `FrontMatterSectionTypesIndexed.includes(null)` — `false`. Правильно (пропуск).

`get(content, 'sectionIndex')` — `null`. `String(null || '') = ''`. Проверка `&& sectionIndex` — `false` (пустая строка falsy). Пропуск.

### `reduce((a, b) => Math.max(a, b), 0)` — но это `maxIdx`

`Math.max(...siblingIndices)` не используется из-за риска `spread` на большом массиве. `reduce` — надёжнее. Мелочь, но правильно.

### `parentIndex` не trim

```js
const parentIndex = String(get(parentContent, 'sectionIndex') || '');
```

Если `sectionIndex: '  2  '` (пробелы) — `parentIndex = '  2  '`. `return \`${parentIndex}.${nextSubNumber}\`` → `'  2  .3'`. Кривой индекс.

Фикс — `.trim()`.

### Нет обработки ошибок `fs.readdirSync`

`fs.readdirSync(targetDir, { withFileTypes: true })` — если `targetDir` не существует или нет прав — `throw`. Внешний `try/catch` — нет. Исключение уйдёт в `section.Create`, где **есть** `try/catch` (в Фазе 5), но с общим сообщением `«Критическая ошибка: …»`.

### Дублирование логики с `reindexer.directories`

`reindexer.directories` использует **свой** `localCounter++` для auto-индексации. `reindexer.md` вычисляет `maxIdx + 1` — по сути **то же самое**, но по-другому.

- `reindexer.directories` — `localCounter` инкрементируется по мере обхода детей (в порядке `readdirSync`);
- `reindexer.md` — обходит всех детей, находит максимум, прибавляет 1.

Результат одинаковый, если у детей **последовательные** индексы (`1, 2, 3`). Если у детей **пропуски** (`1, 3, 5`):
- `reindexer.directories` даст `6` (max = 5 → 6);
- `reindexer.md` даст `6` (max = 5 → 6).

Если порядок детей `[3, 1, 2]` (неотсортированный `readdirSync`):
- `reindexer.directories` — `localCounter = max(0, 3) = 3` → `4`;
- `reindexer.md` — `maxIdx = 3` → `4`.

Совпадает. Дублирование — не баг, но maintenance: правка в одном — надо править в другом.

### `reindexer.md` не в `module.exports` CLI

`src/plugins/diplodoc-helper-cli.js` — `module.exports` содержит `reindexFigures`, `reindexFootnotes`, но **не** `reindexer.md` (это не команда). Логично.

### `sectionIndex` не поддерживает буквенные префиксы

`parseInt('a5')` = `NaN` — пропуск. Если `sectionIndex: 'a.5'` (что валидно? нет, но пользователь может), не учитывается. Стандарт Diplodoc — только цифры.

### `IndexYaml` / `toc.yaml` не читаются

`calculateNextIndex` читает только `index.md`. Если `toc.yaml` содержит запись с `sectionIndex`, но в `index.md` его нет (рассинхронизация) — модуль не увидит. Правильно (source of truth — `index.md`), но при повреждённом проекте — сюрприз.