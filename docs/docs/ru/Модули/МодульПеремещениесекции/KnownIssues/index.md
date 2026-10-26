---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Перемещение в корень языка невозможно

`collectMoveTargets(languageRoot)` начинает `walk(languageRoot)` — с **детей** корня. Сам `languageRoot` (например, `docs/ru/`) в список **не попадает**.

То есть переместить секцию из `docs/ru/Раздел1/` наверх, в `docs/ru/` — нельзя. Пользователь увидит список секций, но не «корень языка». Единственный способ — перетащить вручную (без обновления ссылок) и починить `toc.yaml` руками.

Починка — добавить `languageRoot` в начало списка в `selectTargetDirectory`:

```js
const targets = [
    { path: languageRoot, label: '(корень языка)', level: 0 },
    ...(await collectMoveTargets(languageRoot)),
];
```

### `getComposedTitle` читает `title:` регуляркой

```js
const titleMatch = content.match(/title:\s*(.+)/);
```

Первое совпадение `title:` в файле, **без** ограничения на frontmatter. Если в теле статьи есть пример YAML с `title: …` и frontmatter **не** имеет `title:` (только `pureTitle:`) — регулярка поймает `title:` из примера. Результат: `name` в `toc.yaml` станет строкой из примера кода.

Использовать `gray-matter` (через `parse`) — правильно, но модуль не использует. Дополнительная проблема: если в frontmatter есть `meta.title: …` (в `index.yaml`-формате), регулярка всё равно ищет `title:`, но `meta.title` идёт после `title:` обычно — совпадение будет на `title:` (правильное). Но если `title:` нет, а есть только `meta.title:` — регулярка поймает `meta.title:` (потому что `title:` внутри `meta.title:` — подстрока). Результат: `name` = `'…'` из `meta.title`, но без `meta.` префикса.

### `getComposedTitle` fallback — имя папки

```js
return titleMatch ? titleMatch[1].trim() : path.basename(sectionPath);
```

Если `title:` нет (только `pureTitle:`) — `name` в `toc.yaml` станет `path.basename(sectionPath)` (например, `Раздел1.Введение` без пробела). На странице пользователь увидит «Раздел1.Введение» вместо «Раздел 1. Введение».

Fallback должен быть `pureTitle` (если есть) или `title`, а не `basename`. Проблема редкая (обычно `title` есть), но заметная на «грязных» секциях.

### Порядок операций при `!isSameParent` не атомарен

Четыре шага:

1. `TocYamlEntryRemove` — удалили из старого родителя.
2. `fs.renameSync` — перенесли папку.
3. `updateLinksAfterRename` — обновили ссылки.
4. `TocYamlEntryInsertAtPosition` — добавили в нового родителя.

Если **шаг 2** (`fs.renameSync`) упадёт (кросс-диск, нет прав) — шаг 1 уже выполнен. Раздел «пропал» из навигации (запись в `toc.yaml` старого родителя удалена), но папка на месте. `catch` в `ux_section_move` ловит, показывает `«Ошибка перемещения: …»`. Пользователь получает раздел в исходной папке, но не в `toc.yaml`.

Если **шаг 3** (`updateLinksAfterRename`) упадёт — шаг 4 не выполнится. Раздел в новой папке, ссылки в старом состоянии, `toc.yaml` нового родителя без записи.

Если **шаг 4** (`TocYamlEntryInsertAtPosition`) упадёт — раздел в новой папке, ссылки обновлены, но `toc.yaml` без записи. На странице пользователь раздел не увидит.

Правильный порядок — «сначала файлы, потом `toc.yaml`», и атомарность через временную папку: перенести в `targetPath.tmp`, обновить ссылки, переименовать `targetPath.tmp` → `targetPath`, обновить `toc.yaml`. Модуль этого не делает.

### `updateLinksAfterRename` глотает ошибки

`updateLinksInProject` (из `diplodoc-helper.links.md.js`):

```js
for (const filePath of files) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = updateLinksInContent(...);
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    } catch (err) {
        console.warn(`Ошибка обработки ${filePath}:`, msg);
    }
}
```

Ошибка `fs.writeFileSync` на каком-то файле (нет прав, диск переполнен) — `console.warn` в консоль расширения, **не** прерывает цикл. Внешний `catch` в `performMove` не сработает — он увидит «успех».

Итог: часть файлов обновилась, часть — нет. Пользователь видит `«Обновлено ссылок в …»`, а где-то остались старые ссылки. При следующей сборке — битые ссылки.

Это та же проблема, что в [`section.Delete`](../МодульУдалениесекции/index.md). Фикс — общий для `links.md`: передавать ошибки наружу, а не глотать.

### `updateLinksAfterRename` обходит **все** `.md` в проекте, включая перемещённый раздел

`updateLinksInProject(projectRoot, transform, stubText)` — `findFiles(projectRoot, '.md')` вернёт `.md` и внутри перемещённого раздела. Для ссылок **внутри** раздела на **файлы того же раздела** `transform` вернёт `newPath`, но относительный путь **не изменится** (оба файла переехали вместе). `updateLinksInContent` пересчитает путь и запишет то же самое — лишняя работа, но не ошибка.

Для ссылок из раздела **на внешние файлы** — относительный путь **изменится** (глубина вложенности другая). Например, из `Раздел1/foo.md` на `common/bar.md` — путь `../common/bar.md`. После перемещения `Раздел1` в `Раздел2/Раздел1` — `../../common/bar.md`. `updateLinksInContent` корректно пересчитает.

То есть **это** `section.Move` обновляет правильно — в отличие от `section.Delete` (где обход внутри раздела приводит к порче).

### `TocYamlEntryRemove` ищет только `index.md`

Та же проблема, что в [`section.Delete`](../МодульУдалениесекции/index.md): `targetHref = sourceName + '/index.md'`. Если запись была с `href: sourceName/index.yaml` или `href: sourceName/index.html` или `href: sourceName/` — фильтр не сработает. Запись останется в `toc.yaml` старого родителя.

Симптом: после перемещения `toc.yaml` старого родителя содержит **и** старую запись (не удалилась), **и** новую (если она была добавлена в тот же родитель — не бывает при `!isSameParent`). В старом родителе — «висячая» запись на несуществующую папку.

### `TocYamlEntryInsertAtPosition` при `after` — тихий fallback

```js
if (targetIndex !== -1) {
    tocData.items.splice(targetIndex + 1, 0, newEntry);
} else {
    tocData.items.push(newEntry);
}
```

Если `afterName` не найден в `tocData.items` (например, `afterName` ссылается на запись, которая была удалена между QuickPick и `InsertAtPosition` — теоретически возможно при параллельном редактировании), запись добавляется **в конец**. Пользователь выбрал «После: Раздел1.Введение», а раздел появился в конце `toc.yaml`. Молча.

Правильно — бросить ошибку или предупредить.

### `error.self` — мёртвый NLS-ключ

В `package.nls.json`:

```json
"plugin.section.move.error.self": "Нельзя переместить раздел в самого себя."
```

Но в коде `error.self` **не используется**. Проверка на «переместить в себя»:

```js
if (isSameParent && position.position === 'after' && position.afterName === sourceName) {
    vscode.window.showWarningMessage(translate(nls_ts.plugin.section.move.warning.samePosition, sourceName));
    return false;
}
```

Это про «сменить позицию на текущую» — предупреждение `warning.samePosition`. А «переместить в папку самого себя» (например, `Раздел1` → `Раздел1/Подраздел`) — проверяется через `error.recursive`:

```js
if (!isSameParent && targetPath.startsWith(sourcePath + path.sep)) { … error.recursive … }
```

То есть оба случая покрыты, но разными ключами. `error.self` — мёртвый.

### `updateLinksAfterRename` с `stubText = '**удалено**'` — вводит в заблуждение

В `performMove`:

```js
await updateLinksAfterRename(sourcePath, targetPath, projectRoot, '**удалено**');
```

Но `transform` в `updateLinksAfterRename` возвращает **только** `newPath` (для ссылок на перемещённое) или `undefined` (для всех остальных). `stubText` используется только если `transform` вернёт `null` — то есть никогда. Параметр — мёртвый в этой функции.

Формулировка `'**удалено**'` сбивает с толку при чтении кода — кажется, что ссылки на перемещённое будут заменены на заглушку. Нет, будут пересчитаны на новый путь. См. `updateLinksAfterDelete` — **там** `stubText` реально работает.

### `selectTargetDirectory` — `matchOnDescription: true` бесполезен

```js
const items = targets.map(t => ({
    label: '  '.repeat(t.level) + t.label,
    description: t.path,
    targetPath: t.path,
}));

const selected = await vscode.window.showQuickPick(items, {
    placeHolder: translate(nls_ts.plugin.section.move.placeholder.targetfolder),
    matchOnDescription: true,
});
```

`description: t.path` — полный абсолютный путь. При поиске в QuickPick пользователь набирает «Введение», QuickPick ищет по `label` и `description`. По `description` — по абсолютному пути, что совпадает почти всегда (все пути начинаются с `C:\…` или `/home/…`). Фильтрация по `description` даёт шум: пользователь набирает «foo», и в списке остаются все, у кого в пути есть «foo».

`matchOnDescription: true` имеет смысл, когда `description` короткий и семантичный (например, `'module'`, `'article'`). Здесь — абсолютный путь, бесполезно.

### `getLanguageRoot` может вернуть не-корень-языка

Та же проблема, что в [`section.Delete`](../МодульУдалениесекции/index.md): `isLanguageRoot(current)` определяется как «есть `toc.yaml`, нет `index.md`». Если у пользователя есть папка `docs/ru/foo/` без `index.md` с `toc.yaml` (черновики), `getLanguageRoot` вернёт её. Тогда `collectMoveTargets` и `findFiles` работают в `docs/ru/foo/`, а не в `docs/ru/`.

Практический эффект: в `QuickPick` будут только секции внутри `foo/`, а перемещение в разделы `docs/ru/` — недоступно. Ссылки из `docs/ru/bar.md` — не обновятся.

### `fs.renameSync` — кросс-диск не поддерживается

`fs.renameSync` работает только в пределах одной файловой системы. Если `docs/ru/` на SSD, а `build/` (или `docs/en/`) на HDD — `renameSync` бросит `EXDEV: cross-device link not permitted`. `catch` в `ux_section_move` поймает, покажет `«Ошибка перемещения: EXDEV …»`.

Правильно — `fs.renameSync` + fallback на `fs.cpSync` + `fs.rmSync` при `EXDEV`. Но в контексте одного проекта это редкий сценарий. Плюс — в `isSameParent` проверка `oldParentDir === newParentDir` ловит **только** прямых братьев; если пути разные, но на одной ФС (например, `docs/ru/Раздел1/` → `docs/ru/Раздел2/`) — `renameSync` работает.

### `fs.existsSync(targetPath)` — проверка на любую папку, не только секцию

```js
if (!isSameParent && fs.existsSync(targetPath)) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.sectionexists, sourceName));
    return false;
}
```

Если в `targetDir` есть **пустая** папка `Раздел1.Введение` (или папка без `index.md`), `fs.existsSync` вернёт `true` — ошибка `«В целевой папке уже существует раздел "Раздел1.Введение"»`. Хотя это не «раздел», а просто папка. Пользователь не может переместить раздел туда, где лежит «пустышка».

Правильно — проверять `isDiplodocSection(targetPath)`. Если это «пустышка» — либо удалить её и переместить, либо спросить пользователя «Перезаписать?».

### `references` не собираются

В отличие от [`section.Delete`](../МодульУдалениесекции/index.md), `section.Move` **не** собирает `references` заранее. Это правильно: при перемещении ссылки не удаляются, а пересчитываются. Но если в проекте тысячи `.md` — обход для `updateLinksAfterRename` занимает секунды, и пользователь ждёт без индикатора прогресса (нет `withProgress`). См. следующий пункт.

### Нет `withProgress`

Обновление ссылок на большом проекте (1000+ `.md`) — секунды. `await updateLinksAfterRename(...)` блокирует UI без индикатора. VS Code показывает «задумчивость» расширения, пользователь не понимает, что происходит.

Починка — обернуть в `withProgress({ title: 'Обновление ссылок…', cancellable: false }, ...)`.

### Сообщение об успехе содержит `sourceName`, а не число ссылок

NLS-ключ `plugin.section.move.info.success`: `"Обновлено ссылок в {0} файлах"`. В коде:

```js
vscode.window.showInformationMessage(translate(nls_ts.plugin.section.move.info.success, sourceName));
```

`{0}` = `sourceName` (имя папки), а не число. Итог: `«Обновлено ссылок в Раздел1.Введение файлах»` — грамматически неверно и семантически ложно.

Правильно — передавать число файлов, где были замены. Но `updateLinksAfterRename` не возвращает число. Значит, либо менять сигнатуру, либо менять NLS-сообщение на `«Раздел "<name>" перемещён»`.

### `uri` из палитры — тихий выход

Как и в `section.Create`/`section.Delete`. `if (!uri) return;` — без сообщения.

### `isSameParent` — `getComposedTitle` вызывается **после** проверок

```js
console.log(`[Move] Изменение позиции внутри одного родителя для: ${sourceName}`);
const composedTitle = await getComposedTitle(sourcePath);
TocYamlEntryMoveWithinSameFile(newParentDir, composedTitle, sourceName, position);
```

`getComposedTitle` — `async`, но `performMove` — тоже `async`, `await` стоит. Функция читает `index.md` целиком ради одного regex-совпадения. Мелочь, но если `isSameParent` — вся работа сводится к перестановке записи в `toc.yaml`. Можно было бы взять `name` из существующей записи в `toc.yaml` (не пересчитывать), но `TocYamlEntryMoveWithinSameFile` требует `composedTitle`, потому что переписывает `name` в `movingEntry`. Логика: «пересчитать name из index.md, чтобы оно соответствовало актуальному состоянию».

Если пользователь менял `title` в `index.md` вручную (без `Rename`), то `Move` это «подхватит» и обновит `name` в `toc.yaml`. Побочный эффект — приятный.

### `TocYamlEntryMoveWithinSameFile` — не проверяет `movingEntry` на `null`

```js
const [movingEntry] = tocData.items.splice(currentIndex, 1);
if (currentIndex === -1) { console.error(…); return; }
```

Стоп, порядок в коде:

```js
const currentIndex = tocData.items.findIndex(...);
if (currentIndex === -1) {
    console.error('❌ Элемент не найден в текущем TOC для перемещения');
    return;
}
const [movingEntry] = tocData.items.splice(currentIndex, 1);
```

Проверка `currentIndex === -1` **до** `splice` — правильно. Если не найден — `console.error` и `return`. Но `return` без модификации файла: `toc.yaml` остаётся как был. Пользователь видит `«Ошибка перемещения: …»` (внешний catch не сработает, потому что `return`, а не `throw`). То есть `performMove` возвращает `true`, `ux_section_move` показывает `«Перемещено»`, а на деле — ничего не произошло.

Реальный сценарий: `TocYamlEntryRemove` при `!isSameParent` уже удалил запись, а `TocYamlEntryInsertAtPosition` — добавляет. Для `isSameParent` `TocYamlEntryMoveWithinSameFile` ищет запись по `sourceName` — она должна быть, потому что родитель тот же. Но если пользователь вручную правил `toc.yaml` и запись пропала — модуль не найдёт, ошибка уйдёт в `console.error`, `return` без `throw`, «успех» на экране.