---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `removeFileOrDirectory` с `force: true` — тихое «успешно»

```js
function removeFileOrDirectory(isDirectory, deletedPath) {
    if (isDirectory) {
        fs.rmSync(deletedPath, { recursive: true, force: true });
    } else {
        fs.unlinkSync(deletedPath);
    }
}
```

Для папки `fs.rmSync(deletedPath, { recursive: true, force: true })` **не бросает** исключение при:

- отсутствии прав (файл только для чтения, папка защищена);
- занятости файла другим процессом (Windows);
- слишком длинном пути (> 260 символов на Windows без `\\?\`).

Модуль после вызова показывает `"Раздел «<folderName>» успешно удалён."`. Пользователь считает, что раздел удалён, а на диске он остался.

Для файла (`fs.unlinkSync`) — наоборот, ошибка бросится, `catch` её поймает, покажет `"Ошибка при удалении: …"`.

Рассогласование в поведении. `force: true` полезно для идемпотентности (уже удалённый файл — не ошибка), но не должно глушить ошибки прав/занятости.

Правильный фикс — либо убрать `force: true` (тогда ошибка поймается `catch`), либо добавить предварительную проверку `checkDeleteAccess` (см. ниже).

### `checkDeleteAccess` не используется

В `src/commands/diplodoc-helper.fs.access.js` есть функция:

```js
function checkDeleteAccess(paths) {
    for (const p of paths) {
        const parent = path.dirname(p);
        try {
            fs.accessSync(parent, fs.constants.W_OK);
        } catch {
            throw new Error(`Нет прав на удаление ${p} (нет прав в родительской папке)`);
        }
    }
}
```

Она проверяет права на запись в родительской папке. Но `ux_section_delete` и `ux_file_delete` её **не вызывают**. Модуль `fs.access` фактически мёртвый код.

Если бы вызывали — `catch` поймал бы «нет прав» **до** начала удаления, и пользователь получил бы внятное сообщение вместо «успешно удалён» (при `force: true`).

### `TocYamlEntryRemove` ищет только `href: <folderName>/index.md`

```js
const targetHref = `${folderName}/${FrontMatterFiles.INDEX_MD}`;
tocData.items = tocData.items.filter(item => item[FrontMatterToc.ITEMS_HREF] !== targetHref);
```

`FrontMatterFiles.INDEX_MD` — `'index.md'`. То есть запись удаляется, только если `href` **точно** `folderName/index.md`.

Если в `toc.yaml` родителя запись была добавлена:

- вручную с `href: folderName/index.yaml` (старый формат, тоже валидный);
- или `href: folderName/` (ссылка на папку, с `include.mode: link`);
- или `href: folderName/index.html` (сборка HTML напрямую);

— фильтр **не сработает**. Запись останется в `toc.yaml`, но папки `folderName/` больше нет. `@diplodoc/cli` при следующей сборке упадёт с `"Файл не найден"`.

Правильно — проверять все варианты:

```js
const variants = new Set([
    `${folderName}/index.md`,
    `${folderName}/index.yaml`,
    `${folderName}/index.html`,
    `${folderName}/`,
]);
tocData.items = tocData.items.filter(item => !variants.has(item[FrontMatterToc.ITEMS_HREF]));
```

Плюс — проверять `item.include?.path`: если `include.path` начинается с `folderName/`, это тоже запись на удаляемую секцию.

### `getLanguageRoot(parentDir)` — иногда «не тот» корень

`getLanguageRoot(sourcePath)`:

```js
let current = path.dirname(sourcePath);
while (current && current !== path.parse(current).root) {
    const basename = path.basename(current).toLowerCase();
    if (basename === 'docs') {
        const rel = path.relative(current, sourcePath);
        const firstSegment = rel.split(path.sep)[0];
        if (firstSegment && firstSegment !== '..' && firstSegment !== '') {
            const langCandidate = path.join(current, firstSegment);
            if (fs.existsSync(langCandidate) && fs.statSync(langCandidate).isDirectory()) {
                return langCandidate;
            }
        }
        return current;
    }
    if (isLanguageRoot(current) && !isDiplodocSection(current)) {
        return current;
    }
    current = path.dirname(current);
}
```

Проблема: `isLanguageRoot(current)` определяется как «есть `toc.yaml`, нет `index.md`». Если у пользователя есть папка `docs/ru/foo/` без `index.md`, но с `toc.yaml` (например, «черновики»), `getLanguageRoot` вернёт **её**, а не `docs/ru/`. Тогда `findReferencesToMdSection` ищет ссылки только внутри `docs/ru/foo/`, а ссылки на удаляемый раздел из `docs/ru/bar.md` пропустит.

Практически: `isLanguageRoot` должен проверять basename на соответствие `/^[a-z]{2}$/i`, а не только наличие `toc.yaml`. Или — `getLanguageRoot` должен сразу искать `docs/<lang>` по сегментам пути (через `parts.findIndex(p => p === 'docs')`), как в fallback.

### `updateLinksInProject` обходит **все** `.md` в проекте, включая внутри удаляемого раздела

```js
async function updateLinksInProject(projectRoot, transformTarget, stubText) {
    const files = await findFiles(projectRoot, '.md');
    for (const filePath of files) { … }
}
```

`findFiles(projectRoot, '.md')` вернёт все `.md`, включая `targetDir/**/*.md`. Для ссылок **внутри** удаляемого раздела, которые указывают на другие файлы **того же раздела**, `transform` вернёт `null` → текст станет `**удалено**`.

Практические последствия:

- если удаление пройдёт успешно — файлы внутри раздела удалятся, изменения неважны;
- если удаление **провалится** (см. `force: true`) — в сохранённых файлах раздела будут `**удалено**` вместо реальных ссылок. Пользователь увидит «раздел на месте, но содержимое испорчено».

Правильно — исключать `targetDir` из обхода:

```js
const files = (await findFiles(projectRoot, '.md'))
    .filter(f => !f.startsWith(targetDir + path.sep) && f !== targetDir);
```

Или, как минимум, `targetDir/**/*.md` не читать и не писать. Сейчас `findReferencesToMdSection` **исключает** их из `references` (для сообщения), но `updateLinksInProject` (для действий) — **не** исключает. Рассогласование.

### `references` используется только как «флаг» для `updateLinksAfterDelete`

```js
if (references.length > 0) {
    await updateLinksAfterFolderDelete(deletedPath, projectRoot, stubText);
}
```

`updateLinksAfterFolderDelete` обходит **все** `.md` и вызывает `transform`. Не важно, какие файлы в `references` — если есть хоть одна ссылка, обходятся все. Если `references` пуст — обхода нет (ссылок нет).

То есть `references` (результат `findReferencesToMdSection`) **не** определяет список файлов для замены. Только факт «есть ли ссылки вообще». Само обновление — по всему `projectRoot`.

Практически это работает (заменяются все), но:

- **двойная работа**: `findReferencesToMdSection` обходит все `.md` (для сообщения), потом `updateLinksAfterFolderDelete` обходит все `.md` ещё раз (для замены). На большом проекте — заметно.
- **если `findReferencesToMdSection` нашёл ссылки, но `updateLinksAfterFolderDelete` упадёт на каком-то файле** — `updateLinksInProject` ловит `try/catch` внутри цикла (`console.warn`), не бросает наружу. Ошибка **не** прервёт цикл. См. следующий пункт.

### `updateLinksInProject` глотает ошибки

```js
for (const filePath of files) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = updateLinksInContent(content, filePath, transformTarget, stubText);
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    } catch (err) {
        var msg = err instanceof Error ? err.message : String(err);
        console.warn(`Ошибка обработки ${filePath}:`, msg);
    }
}
```

Если `fs.writeFileSync` упадёт на каком-то файле (нет прав, диск переполнен), `catch` проглотит ошибку, выведет `console.warn`, и цикл продолжит. Внешний `catch` в `ux_section_delete` **не** сработает — он увидит «успешно» (потому что `updateLinksInProject` не бросил).

В итоге: часть файлов обновлена, часть — нет. Пользователь видит «успешно», а где-то остались битые ссылки. См. «Известные ограничения».

### `findReferencesToMdSection` — только внутри `projectRoot`

`projectRoot = docs/ru/`. Если проект мультиязычный (`docs/ru`, `docs/en`), ссылки из `docs/en/` на `docs/ru/…` **не** найдутся. Практически — межъязыковые ссылки редки, но если есть — они не заменятся, `@diplodoc/cli` упадёт.

Модуль работает в «один язык за раз». Для мультиязычного нужно обходить `path.dirname(projectRoot)` (то есть `docs/`), но это уже другой масштаб.

### `uri` из палитры — тихий выход

Как и в `section.Create`. `if (!uri) return;` — без сообщения. Команда видна в палитре, но не работает.

### `references` может врать

`findReferencesToMdSection` считает ссылки по регулярке `/\[([^61]]*)\]\(([^62]+)\)/`. Не учитывает:

- **reference-style links** (`[text][ref]` + `[ref]: url` отдельной строкой);
- **HTML-ссылки** (`<a href="…">`);
- **wiki-links** (`[[path]]`, если где-то используются).

Если в проекте есть reference-style ссылки на удаляемый раздел — в `references` их не будет. Модуль покажет «Ссылок не найдено», а после удаления `@diplodoc/cli` будет ругаться на битую ссылку. См. `parseMarkdownLinks` — там только inline-формат.

### Отсутствует `confirm` для «много ссылок»

Если `references.length > 100`, сообщение покажет только 12 первых и «... и ещё N». Пользователь не увидит полный список. Но кнопка «Удалить» всё равно активна — нажатие удалит раздел и заменит все 100 ссылок.

Можно было бы при большом числе ссылок требовать второй confirm или делать dry-run. Сейчас — один шаг.

### Файлы и папки только через `force: true` — нет «частичного» удаления

`fs.rmSync(deletedPath, { recursive: true, force: true })` — либо удалит всё, либо (при `force: true`) — не бросит, но оставит часть. Нет сценария «удалилось 90%, покажу, что осталось». Если в папке 1000 файлов и один занят — `fs.rmSync` с `force: true` попробует удалить все, «занятый» пропустит молча. Результат: 999 удалено, 1 осталось, папка на месте. Пользователь увидит «успешно».

### `smart.delete` не различает «не-секция с toc.yaml»

Если пользователь вызовет `smart.delete` на папке `docs/ru/foo/`, у которой нет `index.md` (не секция), но `toc.yaml` родителя на неё ссылается (например, `include` на подпапку без индекса) — `smart.delete` пойдёт в `ux_file_delete`, `TocYamlEntryRemove` **не** вызовется. Запись в `toc.yaml` останется.

Это ограничение `file.Delete`, но проявляется через `smart.delete` — пользователь ожидает, что «Удалить, очищая ссылки» очистит всё. См. будущую статью `file.Delete`.