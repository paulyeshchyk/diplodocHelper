---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `.jpeg`, `.gif`, `.webp` — команда не видна

`when` покрывает только `.png`, `.jpg`, `.svg`. Если пользователь кликает на `.jpeg` или `.webp` — `smart.delete` **не появляется** в контекстном меню. Пользователь удаляет через стандартный `Delete` в VS Code — без очистки ссылок.

Расширить `when` на `.jpeg`, `.gif`, `.webp` — одна строка. Рассинхрон с `isImage` в `link.Copy` (там все шесть покрыты).

### `fs.existsSync` → `fs.statSync` — race condition

```js
if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() && isDiplodocSection(targetPath)) {
```

`fs.existsSync` проверяет существование, `fs.statSync` — тип. Между ними микросекунды — если файл удалён в другом окне, `statSync` бросит `ENOENT`. Внешний `try/catch` отсутствует. Исключение уйдёт в консоль VS Code.

Правильно — `try { const stat = fs.statSync(targetPath); … } catch { /* file.Delete сам разберётся */ }`. Или — убрать `existsSync`, полагаться на `statSync` в `file.Delete`.

### `file.Delete` при несуществующем пути — `throw`

Если `smart.delete` вызван на несуществующем пути (`existsSync === false`), маршрут — `file.Delete`. Внутри:

```js
const isDirectory = fs.statSync(deletedPath).isDirectory();
```

`fs.statSync` бросит `ENOENT`. Внешний `catch` в `ux_file_delete` **отсутствует** до `fs.statSync`. Исключение уйдёт наружу.

Практически: Explorer кэширует, между кликом и вызовом файл может исчезнуть — редко, но возможно.

### Папка-не-секция без `toc.yaml` — `file.Delete` не чистит `toc.yaml`

Если пользователь удаляет папку `_drafts/` (не секция, но в `toc.yaml` родителя есть запись через `include.path`), `smart.delete` → `file.Delete`. `file.Delete` **не** вызывает `TocYamlEntryRemove`. Запись в `toc.yaml` остаётся. `@diplodoc/cli` упадёт при сборке.

Это ограничение `file.Delete`, а не `smart.delete`, но проявляется именно через `smart.delete` — потому что пользователь ожидает «очистить всё», а `toc.yaml` не чистится.

Правильно — `smart.delete` мог бы **дополнительно** проверять: если удаляется папка, и в `toc.yaml` родителя есть запись с `href`, начинающимся с `<folderName>/`, — вызвать `TocYamlEntryRemove` перед `file.Delete`. Или — расширить `file.Delete` (не `section.Delete`).

### `ux_smart_delete` не логирует маршрут

В `console.log` ничего не пишется. Если пользователь удалил папку и не понимает, почему ссылки из `toc.yaml` не очистились (потому что это была не-секция) — диагностики нет. `smart.delete` «молча» выбрал `file.Delete`.

Правильно — `console.log('[SmartDelete] Маршрутизация → file.Delete (не-секция)')`. Не для пользователя, для отладки.

### `return ux_*` — VS Code-команда не ждёт

```js
async function ux_smart_delete(uri) {
    // …
    return ux_section_delete(uri);
}
```

`ux_smart_delete` — `async`, возвращает `Promise<…>` (результат внутренней). VS Code при `registerCommand` не ждёт `Promise` — команда считается «выполненной» сразу. Если `section.Delete` упадёт (например, `fs.renameSync` бросит), исключение уйдёт в unhandled rejection. Пользователь увидит ошибку в консоли, но **не** в UI (потому что `ux_section_delete` сам ловит и показывает `showErrorMessage`, но `smart.delete` не добавляет своего контекста).

Практически работает: `section.Delete` и `file.Delete` оба имеют внутренний `try/catch` вокруг опасных операций. Но если что-то упадёт **до** `try/catch` (например, `fs.statSync` в `file.Delete`), — молча.

### `uri` из палитры — тихий выход

`if (!uri) return;` — как и в `section.*`/`file.*`. Команда видна только в Explorer, но программный вызов без `uri` — no-op.

### `isDiplodocSection` — только по трём файлам

`isDiplodocSection` проверяет `index.md` + `index.yaml` + `toc.yaml`. Если у пользователя папка-секция без `index.yaml` (старый формат Diplodoc, до введения `index.yaml`) — не распознается как секция, уйдёт в `file.Delete`. `toc.yaml` родителя не будет очищен.

Практически: стандарт Diplodoc требует все три файла. Но если пользователь мигрировал из старой версии — может быть.

### Отсутствие обратной совместимости в заголовке

В контекстном меню пользователь видит **«Удалить, очищая ссылки»**. Это не говорит, что именно произойдёт:

- для секции — с очисткой `toc.yaml`;
- для файла — без `toc.yaml`.

Пользователь может ожидать одинакового поведения. Разница проявляется только после сборки (для секции — успех, для не-секции-папки — падение `@diplodoc/cli`).

### `smart.delete` не экспортируется из `diplodoc-helper-cli.js`

В `module.exports` файла `diplodoc-helper-cli.js` — нет `ux_smart_delete` (это VS Code-команда, не CLI). Логично. Но и `section.Delete`/`file.Delete` не экспортируются. Для внешних интеграций — неудобно.

### `smart.delete` — единственная точка входа для `file.Delete`

`diplodoc-helper.file.delete` зарегистрирован в `contributes.commands` (заголовок «Удалить файл, очищая ссылки»), но **не** в `menus`. То есть команда доступна только через `commands.executeCommand('diplodoc-helper.file.delete', uri)` или через `smart.delete`. Пользователь не может вызвать `file.Delete` напрямую.

Если пользователь **хочет** удалить файл без очистки `toc.yaml` (что странно, но возможно) — только через `commands.executeCommand`. Или через стандартный `Delete` VS Code (без очистки ссылок вообще).

Это осознанное решение (одна команда для пользователя, остальное — внутренняя маршрутизация), но снижает гибкость.