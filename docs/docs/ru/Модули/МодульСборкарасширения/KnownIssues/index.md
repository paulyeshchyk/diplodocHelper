---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `.vscode/launch.json → preLaunchTask: "Watch (for Debugging)"` — таск не существует

`.vscode/launch.json`:

```json
"preLaunchTask": "Watch (for Debugging)"
```

`.vscode/tasks.json`:

```json
{
    "label": "Watch (for Debugging)",
    "type": "shell",
    "command": "npm run watch",
    …
}
```

`npm run watch` — но в `package.json → scripts` **нет** `watch`. При попытке дебага (F5) — VS Code запустит `npm run watch` → `npm ERR! Missing script: "watch"`. Watch не запустится, `dist/extension.js` не обновится.

**Фикс** — добавить в `package.json`:

```json
"watch": "node build.js --watch"
```

Одна строка.

### `process.exit(1)` — немедленный выход

```js
catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
}
```

`process.exit(1)` — немедленный. Не даёт cleanup-обработчикам (например, `process.on('exit')`) выполниться. В watch-режиме — не критично (пользователь Ctrl+C). В обычной сборке — ок.

Правильно — `process.exitCode = 1; return;`.

### `Watch mode (development with sourcemaps) started...` — всегда «development»

```js
if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watch mode (development with sourcemaps) started...');
}
```

`console.log` всегда пишет «development», даже если `--watch --prod`. `buildOptions` для production (minify: true, sourcemap: false) — корректны, но лог врёт. Пользователь запускает `node build.js --watch --prod`, видит «development with sourcemaps» — сбивает с толку.

### `fs.statSync('dist/extension.js')` — без try/catch

```js
const size = (fs.statSync('dist/extension.js').size / 1024).toFixed(2);
```

Если esbuild вернул `undefined` (ошибка, которую не поймали — маловероятно, `esbuild.build` бросает) — `fs.statSync` бросит `ENOENT`. Внешний `catch` поймает, `console.error`, `process.exit(1)`. Работает.

### `sourcemap` и `sourcesContent` — `!isProduction`

В production — `sourcemap: false`, `sourcesContent: false`. То есть `dist/extension.js` **без** `.map`. Если пользователь открывает `.vsix` в DevTools и хочет отладку — не сможет.

Это **осознанное** решение (production — минифицированный файл, sourcemap не нужен). Но при отладке **в production** (что редко) — неудобно.

### `minify: isProduction` — не `minifySyntax`/`minifyIdentifiers` отдельно

`minify: true` — минифицирует **всё** (синтаксис, идентификаторы, whitespace). Для расширения VS Code это нормально. Но:

- `minifyIdentifiers` ломает `Function.prototype.name` (используется редко);
- `minifySyntax` ломает `debugger` (удаляет его, но это ок).

Для типичного расширения — ок.

### `treeShaking: true` — но `bundle: true` уже включает

`esbuild` с `bundle: true` уже делает tree-shaking (по умолчанию). `treeShaking: true` — явное указание, но не влияет. Мелочь.

### `logLevel: 'info'` — `info` и `warn` в stdout

`esbuild` пишет `info`-сообщения (какие файлы, размер). В CI — ок. В обычной сборке — шумно. `logLevel: 'warning'` — только предупреждения.

### `isWatch` не отключает `isProduction`

`node build.js --watch --prod` — watch + production. `buildOptions` — minify, без sourcemap. Watch будет пересобирать production-бандл при каждом изменении. Работает, но медленнее (minification).

Правильно — либо запретить комбинацию (`if (isWatch && isProduction) { console.warn('watch в prod-режиме — медленно'); }`), либо документировать.

### `buildOptions.sourcemap = !isProduction` — в dev `true`

`dist/extension.js.map` — в dev. VS Code через `launch.json → sourceMaps: true` — отладка по `src/`. Работает.

Но `outFiles: ["${workspaceFolder}/dist/**/*.js"]` — VS Code ищет `.js.map` в `dist/`. Он есть. Ок.

### `fs.mkdirSync('dist', { recursive: true })` — до `try`

```js
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

try { … }
```

Если `mkdirSync` бросит (например, нет прав) — `throw` **до** `try/catch`. Пользователь увидит `Uncaught Error: EACCES` без «Build failed». Мелочь.

### `entryPoints: ['src/extension.js']` — единственная точка

`src/extension.js` — точка входа. **Все** остальные файлы (`src/commands/*`, `src/plugins/*`) — достижимы через `require` из `extension.js`. Если какой-то файл **не** импортируется — не попадёт в `dist/` (tree-shaking, если экспорт не используется).

Проверка: `src/pasteProvider.js` (пустой) — не импортируется нигде. **Не** попадает в `dist/`. Это ожидаемо (пустой файл), но стоит помнить: «мусорные» файлы не батчатся.

### `NODE_ENV=production` vs `--prod`

`isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod')`. То есть `NODE_ENV=production` **или** `--prod`.

В `package.json → build:prod` — `cross-env NODE_ENV=production`. То есть через env. `--prod` — альтернатива (для ручного запуска).

Оба работают. Но если пользователь запустит `NODE_ENV=production node build.js` (без `--prod`) — тоже production. `isProduction` — `true` (env). Ок.

Если пользователь запустит `NODE_ENV=development node build.js --prod` — `isProduction = ('development' === 'production') || true = true`. Production. `--prod` перевешивает. Ок.

### `console.log('Watch mode ...')` — блокирует завершение `build()`

`await ctx.watch()` резолвится **сразу** после старта (не ждёт первого пересчёта). `console.log` — после. `build()` завершается. Процесс **не** выходит (esbuild держит handle).

Пользователь видит «Watch mode started...», а первый `dist/extension.js` появляется через **N** мс (после первого пересчёта). Если пользователь сразу открывает VS Code (F5) — `dist/` может быть **пуст** (первый пересчёт не завершился).

Правильно — дождаться первой сборки:

```js
await esbuild.build(buildOptions);  // initial build
const ctx = await esbuild.context(buildOptions);
await ctx.watch();
console.log('Watch mode started (initial build done)');
```

### `dist/extension.js` — не проверяется содержимое

`fs.statSync('dist/extension.js').size` — только размер. Не проверяется, что это **валидный** JS, что `require('vscode')` есть, что `module.exports.activate` определён.

Валидация — задача VS Code при загрузке. Но если `esbuild` сгенерировал «странный» файл (например, cyclic require) — VS Code упадёт с невнятной ошибкой. `build.js` не диагностирует.

### `source-map` в production — не создаётся

Пользователь, установивший `.vsix`, может захотеть отладить расширение. Без `sourcemap` — только минифицированный код. Для разработчика расширения — неудобно, но это цена production.

### `platform: 'node'` — не `'browser'`

VS Code расширения — Node.js (не browser). `platform: 'node'` — правильно. `'browser'` — для web-расширений (не наш случай).

### Нет `--minify=false` override

Если пользователь хочет «production, но с sourcemap» — нет флага. `--prod` включает minify + отключает sourcemap. `--dev` (не существует) — отключает minify + включает sourcemap. Комбинация `--prod --sourcemap` не поддерживается.

### `watch` без обработки ошибок пересчёта

`ctx.watch()` — при ошибке компиляции (syntax error в `src/`) esbuild выведет ошибку в `logLevel: 'info'`, но `build()` **не** упадёт. Watch продолжит работать. Пользователь увидит error в консоли, но не в UI. Нужно самому проверять.

Это стандартное поведение watch. Для CI — не используется (watch — только локально).

### `dist/` — не очищается перед сборкой

`build.js` не делает `rm -rf dist/`. Старые файлы (`dist/extension.js.map` от предыдущей dev-сборки) остаются, если в prod-сборке sourcemap отключён. То есть `dist/extension.js.map` может быть **старым** (от dev) при prod-сборке. VS Code не загружает `.map` (не указан в `files`), но при отладке — может показать **старый** sourcemap.

Правильно — `fs.rmSync('dist', { recursive: true, force: true })` перед сборкой. Или — `esbuild.build` с `outfile` перезаписывает `.js`, но `.map` остаётся. `esbuild` с `sourcemap: false` **не** удаляет старый `.map`.

### `npm run watch` — отсутствует

Уже упомянуто. Без него `.vscode/launch.json → preLaunchTask` не работает.

### `build.js` не в `module.exports`

`build.js` — исполняемый скрипт, не библиотека. `module.exports` не определён. `require('./build.js')` — выполнит сборку (побочный эффект), не вернёт функцию. Для тестов — неудобно.

Правильно — `if (require.main === module) { build(); } else { module.exports = { build }; }`. Сейчас — `build()` вызывается **всегда** при `require`.