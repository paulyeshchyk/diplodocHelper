---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `manifest` перезаписывает `contributes` полностью

`contributionInject` делает `{ ...originalPackage, contributes }`. `originalPackage` содержит **все** поля, кроме `contributes` (которое перезаписывается). Если пользователь вручную добавил что-то в `contributes` (например, `keybindings`), и этого нет в декларации — **потеряется**.

Правильно — либо явно документировать «`contributes` полностью генерируется», либо мерджить по ключам (`keybindings` оставить, `commands`/`menus`/`submenus`/`configuration` — перезаписать).

### `JSON.stringify(finalManifest, null, 4)` — формат 4 пробела

`package.json` перезаписывается с 4-пробельным отступом. Если исходный был с 2 — формат изменится, git-diff будет шумным. Для проекта с pre-commit hook (например, prettier) — перезапишется обратно в 2. Мелочь.

### `TsConfigParser` — ограниченный парсер TS

Не полный TS-парсер. Не поддерживает:

- многострочные комментарии (только до первой `*/`);
- `@deprecated`, `@since` (игнорируются);
- вложенные объекты (только плоские поля);
- `enum` как отдельный тип (только union строк);
- `Record<K, V>` — как `object` (без разбора).

Для простого `interface DiplodocConfig` — достаточно. Для сложных конфигов — нет.

### `config.parser.tsconfig.js` — regex по JSDoc

```js
if (line.trim().startsWith('')) {
    currentComment += '\n' + lines[i];
    i++;
}
```

**Стоп.** Здесь опечатка: `line.trim().startsWith('')` — **пустая строка** (всегда `true`, потому что `startsWith('')` всегда `true`). То есть любая строка считается «началом JSDoc». См. «Известные ограничения» — потенциальный баг.

Реальный код, скорее всего, `startsWith('/**')` или похожее. В предоставленном файле — `startsWith('')` (пусто). Возможно, при копировании пробелы потерялись, но это критично: если `startsWith('')` — парсер TS **сломан** (все комментарии собираются как один).

Проверить: `npm run generate-manifest` и посмотреть, корректны ли `description` в `contributes.configuration.properties`. Если пустые или мусорные — баг подтверждается.

### `menuItem`/`submenuItem` — порядок аргументов

```js
function menuItem(command, when, groupName, groupOrder, order, separator = SeparatorPosition.NONE) {
```

Шесть аргументов. В декларации:

```js
menuItem('diplodoc-helper.createSection', WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_SECTION, GROUP_ORDER.SECTION, 1)
```

Пять аргументов (без `separator`). Читается как «createSection — когда IS_FOLDER, группа DIPLODOC_SECTION, порядок SECTION, 1». Порядок `groupName, groupOrder, order` — неинтуитивен (обычно наоборот). При большом количестве команд — легко перепутать.

### `ContributionMenuItem` — валидация только «есть command или submenu»

```js
if (!command && !submenu) {
    throw new Error('MenuItem must have either "command" or "submenu"');
}
```

Не проверяется, что `command` **не** пустая строка, что `when` синтаксически корректен, что `group` соответствует формату. Ошибки всплывут позже — при загрузке расширения (VS Code покажет ошибку валидации `package.json`).

### `group` — формат `<prefix><groupOrder>.<groupName>@<order>`

Если `groupOrder` не число, `groupName` содержит `.`, `@`, `order` — не число — формат сломается. В декларации константы (`GROUP_ORDER.SECTION = 1`, `GROUP.DIPLODOC_SECTION = 'diplodoc.section'`, `order = 1`) — корректные. Но при ручной правке легко ошибиться.

### `manifest` не идемпотентен при ручной правке `contributes`

Если пользователь **вручную** отредактировал `contributes` (добавил команду без декларации), а потом запустил `generate-manifest` — правка **потеряется** (перезаписано). Для разработчиков расширения это норма (единственный источник — декларация), но для тех, кто форкнул — сюрприз.

### `diplodoc.config.model.ts` — не TS-файл в прямом смысле

`manifest/config/diplodoc.config.model.ts` — это `.ts`-файл, но `TsConfigParser` парсит его **как текст** (regex + line-scan). Если добавить в файл что-то, что не соответствует ожиданиям парсера (`enum`, `type`, `class`) — не скомпилируется.

Для маленького интерфейса — работает. Для большого — нет.

### `diplodoc.config.model.js` — мёртвый файл?

В `src/plugins/manifest/config/` есть `diplodoc.config.model.js` (пустой, `module.exports = {}`). Используется? Не видно. Возможно, `TsConfigParser` требовал `.js`-версию (скомпилированный `.ts`), и его создали для совместимости. Или — мёртвый код.

### `package.json` → `contributes` — не в git?

`package.json` содержит `contributes` (сгенерированный). Он **коммитится** в git. При каждом `npm run build` — если декларация изменилась — `contributes` меняется, git-diff шумный.

Можно было бы держать `contributes` в `.gitignore` и генерировать при сборке. Но VS Code требует `contributes` в `package.json` при установке — поэтому нужен **готовый** `contributes`. Значит, коммитится.

### `manifest` не проверяет существование `package.json`

```js
const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
```

Если `package.json` нет — `fs.readFileSync` бросит. `catch` в `contributionInject` ловит, `console.error`, `process.exit(1)`. Правильно.

### `manifest` не валидирует `contributes` против схемы VS Code

`contributes` должен соответствовать [schema](https://code.visualstudio.com/api/references/contribution-points). `manifest` генерирует JSON **без** валидации. Если декларация содержит ошибку (например, `when: 'editorLangId == unknown'`) — VS Code покажет warning при установке, но `manifest` не поймает.

Валидация — задача `vsce package` (пакета для публикации) и самого VS Code при загрузке.

### `nls` — не генерируется

`contributes.commands[].title` — `'%command.md.section.create%'`. Это **NLS-плейсхолдер**, который VS Code разрешает через `package.nls.json` / `package.nls.<locale>.json`. `manifest` **не** проверяет, что ключ `%command.md.section.create%` **есть** в `package.nls.json`.

Если ключа нет — VS Code покажет сам плейсхолдер (`%command.md.section.create%`) в UI. Не падение, но плохо.

### `manifest` — единственный модуль, который **пишет** `package.json`

Это **опасно**: ошибка в `manifest` → `package.json` битый → расширение не загружается. `manifest` не делает backup, не валидирует финальный JSON перед записью. `JSON.stringify` не бросит (если объект сериализуемый). Но если `originalPackage` содержит что-то несериализуемое (например, `BigInt` — маловероятно) — `throw` до `writeFileSync`.

Практически: `package.json` всегда сериализуемый JSON. Ошибка — только в логике (неверные `contributes`).