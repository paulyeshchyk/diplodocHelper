---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `tocCleanMode` в фазе `pre` (критический баг)

```js
pre: [
    run('clean build', …),
    cli('reindexFigures', …),
    cli('reindexFootnotes', …),
    cli('helpMap'),
    cli('tocCleanMode'),    // ← ЗДЕСЬ. build/ пуст.
    cli('periodicStat'),
    …
],
```

`tocCleanMode` вызывается **до** `@diplodoc/cli`. На пустом `build/` — `files = []`, ничего не инжектится. После `@diplodoc/cli` HTML создан, но скрипт **не** встроен → clean mode не работает при стандартной сборке.

Правильно — перенести в `post`:

```js
post: [
    …
    cli('contexttags', './build'),
    cli('tocCleanMode', '--outputDir', './build'),   // ← здесь
    cli('ganttFixScroll', './build'),
    …
]
```

Одна строка.

### `process.exit(1)` — немедленный выход при ошибке

```js
catch (e) {
    console.error(`❌ ${step.name}: ${e.message}`);
    process.exit(1);
}
```

`process.exit(1)` завершает Node **немедленно**, не давая шанса cleanup-обработчикам (например, `process.on('exit')`). Если предыдущие шаги оставили открытые дескрипторы или несохранённые данные — потеряются.

Правильно — `process.exitCode = 1; return;` (мягкий выход). `main` продолжит цикл, следующий шаг **выполнится**. Или — `process.exitCode = 1; break;` (выход из цикла, но не из Node).

### `--arg value` не поддерживается

```js
else if (a.startsWith('--phase=')) out.phase = a.slice(8).split(',').filter(Boolean);
```

Только `--phase=pre,build`. `--phase pre` — `a = '--phase'`, `a = 'pre'` — не матчит `--phase=`. Оба игнорируются. Пользователь, привыкший к `git --branch main`, удивится.

### `--skip` без `--only` — но `--only` без `--skip` — работают

`shouldRun` логически корректен: `--only` фильтрует «только эти», `--skip` фильтрует «все, кроме этих». Комбинация — `--only=a,b --skip=a` → выполнится `b`.

Но: если пользователь передал `--only=`, `new Set(''.split(',').filter(Boolean))` = пустой `Set`. `opts.only` = пустой Set (truthy), `opts.only.has(step.name)` = `false` для всех → **все шаги пропущены**. Молчаливый «ничего не сделал».

### `--list` — только имена шагов, без описания

```js
console.log(`  - ${s.name}${off}`);
```

Не показывает фазу, команду, длительность. Для ориентира — минимально.

### `step.cwd` — по умолчанию `projectRoot`

```js
const projectRoot = path.resolve(__dirname, '..');
```

`__dirname` = `src/plugins/`. `path.resolve(__dirname, '..')` = `src/`. То есть `cwd` для шагов — `src/`, **не** корень проекта (`docs/..`). См. «Известные ограничения» — это критично для `CLI = './plugins/diplodoc-helper-cli.js'`. Если `cwd = src/`, то `./plugins/diplodoc-helper-cli.js` = `src/plugins/diplodoc-helper-cli.js` — **существует**. Ок.

Но если пользователь запускает `docs-build.js` из **своего** проекта (шаблон, куда `installer` скопировал `plugins/`), то `__dirname` = `<project>/plugins/`, `projectRoot = <project>/`. `cwd = <project>/`, `CLI = './plugins/diplodoc-helper-cli.js'` — **существует** (скопирован). Ок.

То есть логика правильная, но работает по соглашению: `docs-build.js` всегда в `plugins/` (или `src/plugins/`), а `diplodoc-helper-cli.js` — рядом.

### `NODE_PATH` — от `projectRoot`

```js
NODE_PATH: process.env.NODE_PATH || path.join(projectRoot, 'node_modules')
```

Если `projectRoot = src/` (в **расширении**), то `node_modules` — `src/node_modules/`, которого **нет**. `NODE_PATH` не найдёт модули.

В расширении `src/` — `node_modules` в корне (`<extension>/node_modules/`). `src/node_modules/` — нет. Значит, `NODE_PATH` для дочерних процессов **не сработает** (модули не найдутся).

Практически: дочерние процессы — `node ./plugins/diplodoc-helper-cli.js …` → `require('@diplodoc/cli')` **не** делается (используется `npx`). `require` внутренних модулей — относительные пути (`./helpMap/…`), не нуждаются в `NODE_PATH`. Так что работает случайно.

Для пользователя (шаблон) — `projectRoot = <project>/`, `node_modules` — есть. Работает.

### `buildShellCommand` — только Windows

На Unix — `spawnSync(cmd, args, { shell: false })`. Без shell-функции. Правильно.

Но `buildShellCommand` для Windows — обёртка **каждого** аргумента в кавычки, если есть спецсимволы. `npx @diplodoc/cli -i ./docs -o ./build` — `./docs` не содержит спецсимволов, не оборачивается. `-i`, `-o` — тоже. Работает.

Если аргумент — `--dataPath ./plugins/roadMap/roadmap-data.json` (с `/`) — `/` **не** спецсимвол Windows, не оборачивается. Работает.

Если аргумент — `--targetHtml ./build/ru/Дополнительнаяинформация/Переченьсносок/index.html` (кириллица) — `/` не спецсимвол, но **кириллица** — не в `[a-zA-Z0-9._\-=:,/\\@+]`. Обёртывается в `"…"`. `cmd.exe` с `"…"` — обрабатывает корректно. Работает.

### `run('clean build', …)` — `fs.rmSync` без `try/catch`

```js
run('clean build', () => {
    fs.rmSync(buildDir, { recursive: true, force: true });
}),
```

`force: true` — не бросает при отсутствии `build/` (первый запуск). Ок.

Но если `build/` есть и в нём — файл, занятый другим процессом (Windows) — `rmSync` с `force: true` не бросает, но и не удаляет. Молча. Дальше `@diplodoc/cli` пишет в занятый `build/` — может дать ошибку. Не диагностируется.

### `steps` порядок — захардкожен в массиве

Если шаги зависят друг от друга (например, `createFigureContent` требует `reindexFigures`), порядок в массиве — **единственная** гарантия. Нет явных зависимостей, нет топологической сортировки. При добавлении нового шага — легко поставить не туда.

### `docs-build.js` не в `module.exports` — только `STEPS`, `PHASES`

```js
module.exports = { STEPS, PHASES };
```

Экспортируется **только** `STEPS` и `PHASES`. `main`, `execute`, `parseArgs` — не экспортируются. Для внешних интеграций (require('docs-build').main) — `undefined`.

### Нет `--dry-run`

Пользователь не может «посмотреть, что будет выполнено, без выполнения». `--list` показывает имена, но не команды. Правильно — `--dry-run` с выводом `spawnSync`-команды для каждого шага.

### `run`-шаги не логируют свои действия

`run('clean build', () => fs.rmSync(...))` — единственный лог: `✓ clean build (0.02s)`. Что именно удалено (какие файлы) — не пишется. Для аудита/отладки — не хватает.

### `--phase=build` без `pre` — сломается

Если пользователь запускает только `build`-фазу (`--phase=build`), то `pre`-шаги не выполняются. `docs/` в «сыром» состоянии (без `presets.yaml`, без `reindexFigures`). `@diplodoc/cli --apply-presets internal` упадёт, потому что `presets.yaml` нет.

Правильно — либо документировать «`--phase=build` только после `--phase=pre`», либо добавить проверку.

### `docs-build.js` — `.cmd`-обёртка только для Windows

```cmd
@echo off
node "%~dp0docs-build.js" %*
```

Для Linux/macOS — нет `.sh`-обёртки. Пользователь должен запускать `node ./plugins/docs-build.js` вручную.

### `--quiet` в `@diplodoc/cli` — уменьшает вывод, но не отключает

```js
npx('diplodoc build', '@diplodoc/cli', '-i', './docs', '-o', './build', '--allow-custom-resources', '--apply-presets', '--quiet', 'internal'),
```

`--quiet` — Diplodoc-специфичный флаг. Ошибки всё равно выводятся. Для CI — ок, для локальной разработки — неинформативно (не видно, какие страницы собираются).

### `periodicTable*` — три отдельных шага

```js
cli('periodicTable'),
cli('periodicTableHelpTag'),
cli('periodicTableContext'),
```

Каждый — отдельный `spawnSync` (новый процесс Node). Для трёх отчётов — три полных запуска с инициализацией. Можно было бы один `cli('allTables')`, но модуль `contentNavigator` не поддерживает `--all`. Не баг, но медленно.

### `cleanup service files` — удаляет `.yfm` в `build/`

```js
run('cleanup service files', () => {
    for (const f of ['.yfm', '.yfmignore', '.yfmlint']) {
        fs.rmSync(path.join(buildDir, f), { recursive: true, force: true });
    }
}),
```

Эти файлы — служебные для `@diplodoc/cli`. В `build/` они не нужны. Удаляются **после** `@diplodoc/cli`, но **до** конца. Если пользователь захочет «отладить сборку» — `.yfm` уже удалён.

### `docs-build.js` — нет `npm run docs-build`

В `package.json`:

```json
"scripts": {
    "build": "npm run compile",
    "compile": "npm run generate-manifest && node build.js",
    …
}
```

`docs-build.js` **не** вызывается через npm-скрипт. Только вручную (`node ./plugins/docs-build.js`). Пользователь шаблона получает `docs-build.js` (через `installer`), но должен сам добавить npm-скрипт (или запускать напрямую).

### `package.json → scripts` — `precompile` вызывает `validate` (lint + type-check + test)

```json
"precompile": "npm run validate",
"validate": "npm run lint && npm run type-check && npm run test",
"lint": "echo ''",   // ← пустой
```

`precompile` → `validate` → `lint` (пустой `echo`) + `type-check` + `test`. `npm run compile` сначала запускает `precompile`, потом `generate-manifest`, потом `node build.js`. То есть **тесты и type-check** запускаются при каждой сборке. Медленно, но правильно (защита от регрессий).

`docs-build.js` — **не** через `compile`. Не запускает тесты/type-check. Это правильно (это сборка документации, не расширения), но может смутить.

### `docs-build.js` — `pre`-фаза не «идемпотентна»

Повторный запуск `--phase=pre` без `clean build` (например, `--only=helpMap`) — работает, но `clean build` не вызывается (потому что `--only` ограничивает). Если пользователь запускает несколько `--only` подряд — `build/` накапливает артефакты. Обычно не проблема, но при отладке — сюрприз.