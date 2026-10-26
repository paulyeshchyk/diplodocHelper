---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `src/scripts/build-docs.js` и `src/scripts/utils` **не существуют** в расширении

В `installer.config.js`:

```js
{ src: 'src/scripts/build-docs.js', dest: './build-docs.js' },
{ src: 'src/scripts/utils', dest: './utils' },
```

В `src/` есть `plugins/`, `commands/`, `extension.js`, `nls_loader.js`, `nls_ts.js`, `ContextMenuManager.js`, `pasteProvider.js`. **Нет** `scripts/`.

То есть эти два `item` **всегда** пропускаются (`console.warn('[Installer] Источник не найден: …')`). В `showWarningMessage` — `copiedCount = 1` (только `src/plugins` скопирован). То есть пользователь получает «✅ Скрипты успешно установлены» — но только `plugins/`, а `build-docs.js` и `utils/` **не** установлены.

Правильно — либо добавить `src/scripts/build-docs.js` в репозиторий, либо убрать эти два `item` из конфига.

### `extensionId = 'paulyestchick.diplodochelper'` — захардкожен

При форке расширения (смена `publisher` или `name` в `package.json`) — `installer` не найдёт расширение. Сообщение `❌ Не удалось найти расширение с ID "paulyestchick.diplodochelper"`.

Правильно — читать из `context.extension.id` (но `ux_install_scripts` не принимает `context`). Или — из `package.json` через `vscode.extensions.getExtension`.

### `copyRecursiveSync` — `ignorePatterns` через `includes`

```js
if (ignorePatterns && ignorePatterns.some((pattern) => childItemName.includes(pattern))) {
    return;
}
```

`'test'` — совпадёт с `'contest'`, `'latest'`, `'testament'`. `'.test.js'` — с `'foo.test.jsx'`, `'foo.test.js.bak'`. Простое `includes` — слишком широкое.

Правильно — `childItemName === pattern` или `childItemName.endsWith(pattern)`. Или — regex.

### `src/plugins` — копируется **всё**, включая `manifest.builder`, `installer`, `roadmap-data.json`

`installer` копирует **всю** папку `src/plugins/`. Внутри:

- `manifest.builder/` — build-time VS Code-расширения (не нужен пользователю).
- `installer/` — конфиг установки (не нужен).
- `roadmap-data.json` — данные для демо (может понадобиться).
- `contentNavigator/` — модули отчётов (нужны).
- `abbrs/`, `terms/`, `gosts/`, `contexts/`, `helptags/`, `figures/`, `footnotes/` и т.д. — нужны.

**Лишний вес:** `manifest.builder/` (~15 файлов, ~50 KB) — не нужен. `installer/` — не нужен.

Правильно — исключить `manifest.builder`, `installer`, `manifest/config/vscode.config.manager.js` (VS Code-specific) в `ignorePatterns` или явно перечислить `items`.

### `copyRecursiveSync` — `fs.statSync(src)` до `existsSync`

```js
const exists = fs.existsSync(src);
const stats = fs.statSync(src);
```

**Баг:** `fs.statSync(src)` **до** проверки `exists`. Если `src` не существует — `throw ENOENT`, `exists` не сработал.

В цикле `if (!fs.existsSync(srcPath)) continue;` перед вызовом — гарантирует, что `srcPath` существует. Но при **рекурсивном** вызове для дочерних файлов — `fs.statSync(src)` без предварительной проверки. Если дочерний файл исчез между `readdirSync` и `statSync` (race condition) — `throw`.

Правильно — `if (!exists) return;` или `try/catch` вокруг `statSync`.

### `srcPath` → `destPath` — не нормализуется `..`

`path.join(extensionPath, item.src)` — если `item.src = '../evil'`, `srcPath` выйдет за пределы `extensionPath`. В текущем конфиге — только `src/...`, не злонамеренно. Но при ручной правке конфига — риск.

### `showOpenDialog` — нет проверки, что выбранная папка **не** внутри расширения

Если пользователь выберет `<extension>/src/` — копирование `src/plugins/` → `src/plugins/` (рекурсивное копирование в себя). `fs.copyFileSync` бросит `EINVAL` или создаст странную структуру.

Правильно — `if (targetDir.startsWith(extensionPath)) { showWarningMessage('Нельзя копировать расширение в себя'); return; }`.

### `items` — только `src` и `dest`, без `optional`

Если `src` не существует — `console.warn` и `continue`. Пользователь видит `copiedCount = 1` (только `src/plugins`) и `✅ успешно установлены`. То есть **ложный успех** (см. первый пункт).

Правильно — `optional: true` в конфиге или явный список «что должно быть установлено», и проверка после копирования.

### `showInformationMessage` — без списка установленного

`✅ Скрипты успешно установлены в ${targetDir}` — не говорит, **что** установлено. Пользователь не знает, что `build-docs.js` и `utils/` **не** установлены (если их нет в расширении).

### Нет progress bar

Копирование `src/plugins/` (~100 файлов, ~500 KB) — секунды. Без `withProgress` — «задумчивость». Для `src/plugins` — не критично. Для больших проектов (если добавят `node_modules` по ошибке) — минуты.

### `installer` не поддерживает uninstall

Пользователь, установивший скрипты, не может «откатить» установку через VS Code. Только вручную — удалить `plugins/`, `build-docs.js`, `utils/`.

Правильно — команда `diplodoc-helper.uninstallScripts` (удаляет скопированное). Сейчас нет.

### `installer.config.js` — `ignorePatterns` не исключает `manifest.builder`

См. выше. `manifest.builder` копируется, хотя не нужен.

### `installer` не проверяет версию

Если пользователь установил скрипты из версии 1.54.0, потом обновил расширение до 1.55.0 — скрипты в проекте остались старые. `installer` не сравнивает версии, не предлагает переустановить.

### `installer` — единственная команда в `other`, которая **не** про документацию

Все остальные команды в `other` (`context`, `helptag`, `reindexier`, `abbrs`, `terms`) — операции над документацией. `installer` — «экспорт расширения». Это выбивается из контекста. Пользователь, открывший меню `Прочее`, не ожидает «установить скрипты в другую папку».

Правильно — вынести в отдельное место (например, `Command Palette` без контекстного меню) или в подменю `Debug`.

### `src/scripts/build-docs.js` — задуман, но отсутствует

Судя по конфигу, должен быть **отдельный** `build-docs.js`, отличный от `docs-build.js`. Возможно, это тонкая обёртка для пользователя:

```js
// src/scripts/build-docs.js
require('../plugins/docs-build.js');
```

Или — просто копия. В расширении его **нет** (`src/scripts/` не существует). Значит, `installer` **всегда** копирует только `plugins/`, а `build-docs.js` в проекте пользователя **не появляется**.

### `utils/` — тоже отсутствует

`src/scripts/utils/` — не существует. То же самое: `installer` не копирует `utils/` в проект пользователя.

Если `utils/` нужен (например, для пользовательских скриптов), его надо создать.