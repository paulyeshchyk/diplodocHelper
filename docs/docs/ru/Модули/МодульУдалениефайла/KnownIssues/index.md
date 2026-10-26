---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Не чистит `toc.yaml` родителя

`file.Delete` **не** вызывает `TocYamlEntryRemove`. Если удаляется папка, на которую ссылался `toc.yaml` родителя (через `items.href` или `include.path`), запись остаётся. `@diplodoc/cli` при следующей сборке упадёт с ошибкой «файл не найден».

`section.Delete` эту проблему решает (через `TocYamlEntryRemove`). `file.Delete` — нет.

Практически: `file.Delete` для **файлов** безопасен (`.md`-файлы обычно не в `toc.yaml` — там `index.md` папок). Для **папок** — риск.

### `uri` из палитры — тихий выход

`if (!uri) return;` — команда не видна в палитре (`when` только в `explorer/context`), но если программный вызов без `uri` — ничего не произойдёт. Как и `section.*`.

### `fs.statSync` без `try/catch`

```js
const isDirectory = fs.statSync(deletedPath).isDirectory();
```

Если файл исчез между кликом и вызовом (race condition, параллельное удаление в другом окне VS Code) — `throw` `ENOENT`. Внешний `try/catch` **отсутствует** — исключение уйдёт в консоль VS Code, пользователь увидит общую ошибку расширения.

### `removeFileOrDirectory` с `force: true` — тихое «успешно»

Та же проблема, что в `section.Delete`:

```js
if (isDirectory) {
    fs.rmSync(deletedPath, { recursive: true, force: true });
}
```

`force: true` не бросает при неудаче (нет прав, файл занят). Модуль после вызова показывает «Папка удалена». Пользователь считает, что удалено, а на диске осталось.

Для файлов (`fs.unlinkSync`) — бросает, `catch` ловит.

### `updateLinksInProject` глотает ошибки `fs.writeFileSync`

Как и в `section.Delete`/`section.Move`/`section.Rename`:

```js
for (const filePath of files) {
    try {
        // …
        fs.writeFileSync(filePath, newContent, 'utf8');
    } catch (err) {
        console.warn(`Ошибка обработки ${filePath}:`, msg);
    }
}
```

Частичное обновление — часть файлов обновлена, часть — нет. Внешний `catch` не сработает. Пользователь видит «успешно». Общий фикс — в `links.md.js`, а не здесь.

### `references` — только inline-ссылки

`parseMarkdownLinks` использует regex `(!?)\[([^65]]*)\]\(([^66]+)\)`. Не находит:

- **reference-style** (`[text][ref]` + `[ref]: url`);
- **HTML-ссылки** (`<a href>`);
- **wiki-links** (`[[path]]`).

Ссылки в этих форматах не будут заменены на `**удалено**`. `@diplodoc/cli` упадёт на битых ссылках.

### `FileDeleteMessageBuilder.footer` — пустой

`SectionDeleteMessageBuilder.footer()` возвращает `«Ссылки внутри удаляемого раздела и его подразделов игнорируются…»`. `FileDeleteMessageBuilder.footer()` — `''`.

Для **файла** это логично (нет внутренних ссылок). Для **папки** — скрывает, что ссылки между статьями удаляемой папки **не** обновляются (это правильно — они удаляются вместе с папкой). Пользователь может удивиться: «Почему в диффе не видно ссылок между этими файлами?» — потому что эти файлы удалены.

### `FileDeleteMessageBuilder` переиспользует `plugin.section.delete.confirmation.text`

```js
introduction() {
    if (this.isDirectory) {
        return translate(nls_ts.plugin.section.delete.confirmation.text, this.targetName);
    }
    return translate(nls_ts.crossref.plural.file.confirm.header, this.targetName);
}
```

Для **папки** — `«Удалить раздел «<name>» и всё его содержимое безвозвратно?»`. Слово «раздел» для не-секции вводит в заблуждение: пользователь удаляет папку `_drafts/`, а видит «Удалить раздел». NLS-ключ от `section.Delete`.

### Кнопка `«Удалить»` — не из NLS

```js
const confirm = await vscode.window.showWarningMessage(message, { modal: true }, 'Удалить');
```

Захардкожено на русском. В `en`-локали VS Code — пользователь увидит русскую кнопку. `section.Delete` использует `translate(nls_ts.plugin.section.delete.confirmation.title)` — тоже русское, но через NLS.

### Сообщение об успехе — захардкожено

```js
vscode.window.showInformationMessage(
    isDirectory
        ? `Папка "${targetName}" успешно удалена.`
        : `Файл "${targetName}" успешно удалён.`
);
```

Не через NLS. В `en`-локали — русский текст.

### `getLanguageRoot` может вернуть не-корень-языка

Та же проблема, что в `section.Delete`/`section.Move`: если по пути есть папка без `index.md` с `toc.yaml`, `getLanguageRoot` вернёт её. Тогда `findFiles`/`updateLinksInProject` работают в узком scope.

### `references` может быть пустым для файла с само-ссылками

`findReferencesToMdFile` пропускает сам `targetFilePath`:

```js
for (const filePath of allMdFiles) {
    if (filePath === targetFilePath) continue;
    // …
}
```

Если файл ссылался только на себя (self-references), они не считаются. Ожидаемо (файл удаляется).

### Двойной вызов `findDirectories`

`findReferencesToMdSection` вызывает `findDirectories(targetFolderPath, '.md')`. Потом `updateLinksAfterFolderDelete` — **ещё раз** `findDirectories(deletedPath, '.md')`. Для 1000 `.md` — двойная работа. См. `section.Delete` — то же самое.

### `FileDeleteMessageBuilder` — `introduction` для папки-не-секции

Слово «раздел» для произвольной папки (например, `docs/ru/_drafts/`) — вводит в заблуждение. Пользователь ожидает «Удалить папку», видит «Удалить раздел». Не баг, но UX-несоответствие.