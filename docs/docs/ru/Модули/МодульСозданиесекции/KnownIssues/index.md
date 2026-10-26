---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `promptSectionIndex` не отменяет операцию

Если пользователь нажал `Escape` в диалоге индекса, `promptSectionIndex` вернёт `undefined`. В `ux_section_create`:

```js
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
```

`undefined` попадёт в `sectionIndex`. Далее `createSectionFolder` → `TEMPLATE_FOLDER_NAME(sectionType, name, undefined)` — `sectionIndex` обработается как пустой (`if (hasIndex && hasIndex.trim() !== '')` → false). Итог: папка создастся **без** индекса, `index.md` без `sectionIndex`, `toc.yaml` без индекса.

Пользователь нажал `Escape`, ожидая отмены — а получил созданную секцию без индекса. Несоответствие UX.

Правильно было бы:

```js
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
if (sectionIndex === undefined) return; // отмена
```

### `composeFullTitle` без пробела для `hasPrefix && !hasIndex`

```js
if (hasPrefix && !hasIndex) return sectionType.value;
```

`'Раздел'` + `''` → `'Раздел'`. `fullTitle = 'Раздел' + 'Введение' = 'РазделВведение'`. Ни пробела, ни точки.

Это тот же кейс, что `TEMPLATE_FINAL_TITLE` обрабатывает через `'Раздел. Введение'` (точка, пробел). Расхождение между двумя функциями — реальный баг. Пользователь, создавший секцию типа «Раздел» без индекса, получит `toc.yaml` с `name: РазделВведение` (плохо) и `index.md` с `title: Раздел. Введение` (хорошо). Ссылки и навигация в `toc.yaml` будут с «некрасивым» названием.

Починка — в `composeFullTitle` добавить `+ '. '`:

```js
if (hasPrefix && !hasIndex) return sectionType.value + '. ';
```

Или лучше — отказаться от дублирования, заменить `composeFullTitle` на `TEMPLATE_FINAL_TITLE`.

### `TocYamlEntryPatchItems` добавляет в конец, не сортирует

После создания `Раздел 1` → `Раздел 2` → `Раздел 3` они в `toc.yaml` окажутся в порядке 1, 2, 3 (потому что так создавались). Но если пользователь создаёт `Раздел 5` первым, потом `Раздел 2` — в `toc.yaml` будет 5, 2. Пока не запустят `sortTocItems` (вручную через `section.Rename` или через `reindexer.directories`), порядок будет «порядок создания».

`section.Create` не вызывает `sortTocItems` после `TocYamlEntryPatchItems`. Это согласуется с `reindexer.directories` — сортировка делается в общем проходе. Но при отдельном использовании (без полной переиндексации) `toc.yaml` останется в порядке создания.

### `isValidName` не отсеивает спецсимволы

`ShowSectionNameSelector` валидирует только длину и непустоту. Спецсимволы в названии:

- **в `title`** (`Раздел 1. <Введение>`) — попадут как есть, ломая YAML (если в значении есть `<`, `>`);
- **в `pureTitle`** — то же;
- **в имени папки** — вырежутся `replace(/[^60]/g, '')`.

Итог: `title` содержит спецсимволы, а `folderName` — только буквы/цифры. Может привести к коллизии: две секции «Введение» и «Введ<ение>» дадут одинаковое имя папки `Раздел1.Введение` и `Раздел1.Введение` — `createDirectory` упадёт на `canCreateFolder` (папка уже есть) и покажет «Путь уже существует: …». Пользователь не поймёт, почему «Введ<ение>» конфликтует с «Введение».

Также `isValidName` не проверяет зарезервированные имена Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`). Секция «CON» создаст папку `Раздел1.CON` — в Windows это приведёт к ошибке `fs.mkdirSync`. Сообщение — `console.error(err)` в `createDirectory`, без показа пользователю. См. `createDirectory` — `catch` не вызывает `onError`.

### `createDirectory` глотает `fs`-ошибки

```js
function createDirectory(canCreateFolder, newFolderPath, recursive, folderName, onError) {
    if (!canCreateFolder(newFolderPath, onError)) return null;
    try {
        fs.mkdirSync(newFolderPath, { recursive: recursive });
        return { folderPath: newFolderPath, folderName: folderName };
    } catch (err) {
        console.error(err);
        return null;
    }
}
```

`canCreateFolder` проверяет существование и права **до** вызова `fs.mkdirSync`, но между этими двумя проверками есть окно (race condition): файловая система могла измениться (параллельный процесс). Также могут быть ошибки, которые `canCreateFolder` не ловит: невалидное имя (`CON`), слишком длинный путь (> 260 символов на Windows), спецсимволы в пути на Linux.

В `catch` — только `console.error(err)`. Пользователь не видит никакого сообщения о том, что создание не удалось, — только в Developer Tools расширения.

Должно быть:

```js
} catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    return null;
}
```

### `uri` из палитры — тихий выход

```js
if (!uri) return;
```

Команда видна в палитре (`Ctrl+Shift+P` → «Создать секцию») — VS Code позволяет вызвать её без контекста Explorer. В этом случае `uri` = `undefined`, и функция молча возвращается. Пользователь ничего не видит.

Есть два сценария:

1. **Пользователь вызвал из палитры** — ожидает, что его спросят, где создавать.
2. **Пользователь вызвал из контекстного меню** — `uri` гарантирован (`when: explorerResourceIsFolder`).

Можно было бы при `!uri` вызвать `vscode.window.showOpenDialog` (папка) и дальше работать. Или — если считаем, что команда только из контекстного меню, — `when` в `package.json` мог бы запретить вызов из палитры (`"when": "false"` в `commandPalette`). Сейчас — разрешено и молча не работает.

### `<` `>` в `title` ломают YAML

`ShowSectionNameSelector` разрешает `<` и `>`. `IndexMdFileCreate` пишет:

```yaml
title: Раздел 1. <Введение>
```

`js-yaml` (через `YAML.stringify`) может автоматически заключить в кавычки, если значение содержит спецсимволы. Проверка:

- если `YAML.stringify({ title: 'Раздел 1. <Введение>' })` → `title: Раздел 1. <Введение>` (без кавычек) — YAML невалиден;
- если с кавычками → `title: 'Раздел 1. <Введение>'` — валидно.

`js-yaml` и `yaml` (пакет) по-разному обрабатывают `<>`. В `.eslintrc.js`/`package.json` оба пакета в зависимостях, но `sections.core` использует **`yaml`** (пакет) через `YAML.stringify`. У `yaml` (пакет) `stringify` по умолчанию добавляет кавычки, если значение выглядит как специальный YAML-токен. `<` и `>` — не YAML-спецсимволы (в YAML спецсимволы: `@`, `` ` ``, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `!`, `|`, `>`, `'`, `"`, `%`). Из них `>` — да (block scalar indicator в начале значения), `|` — тоже. `<` — нет.

То есть `title: Раздел 1. <Введение>` — валидный YAML (значение — plain scalar, `<` допустим). А `title: Раздел 1. >Введение>` — **сломается**: `>` в начале значения интерпретируется как начало folded scalar. Пользователь, введший `>Введение` в имя, получит битый frontmatter. VS Code покажет `parse error` при открытии.

Правильно — валидировать в `ShowSectionNameSelector`: запретить `@`, `` ` ``, `|`, `>`, `&`, `*`, `!`, `%` в начале или вообще в имени. Или — всегда оборачивать `title` в кавычки (что `YAML.stringify` и делает для некоторых случаев, но не для всех).

### `IndexMdFileCreate` не проверяет существование файла

```js
function IndexMdFileCreate(folderPath, title, sectionType, sectionValue, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    const metaObj = { … };
    fs.writeFileSync(filePath, `---\n${YAML.stringify(metaObj)}---`, 'utf8');
}
```

`fs.writeFileSync` **перезаписывает** файл, если он уже существует. В `section.Create` это безопасно: `createSectionFolder` только что создал папку (пустую), файлов нет. Но если кто-то вызовет `IndexMdFileCreate` напрямую на существующей папке — данные потеряются.

Симметричная проблема: `TocYamlEntryPatchItems` не проверяет, что в `toc.yaml` родителя **нет** записи с таким же `href`. Если по какой-то причине `createSectionFolder` вернул папку, которая уже была (например, race condition), в `toc.yaml` появится дубль.

### Сообщение об успехе не содержит имени папки

```js
vscode.window.showInformationMessage(
    translate(nls_ts.plugin.section.create.info.success, fullTitle, sectionType.label)
);
```

NLS-ключ `plugin.section.create.info.success`: `"Раздел «{0}» ({1}) создан!"`. Куда попадают `fullTitle` («Раздел 1. Введение») и `sectionType.label` («Раздел»). Итого: «Раздел «Раздел 1. Введение» (Раздел) создан!».

Слово «Раздел» трижды: в «Раздел «…» (Раздел)», плюс внутри `fullTitle`. Читается странно. И **имя папки** (`folderName`, `Раздел1.Введение`) не упоминается — если пользователь захочет открыть папку из терминала, придётся угадывать имя.

Идеально было бы: «Создана секция «Введение» (`Раздел1.Введение`). Тип: Раздел. Индекс: 1.» — с явным именем папки.

### `isValidName` — единственная проверка, и она почти пустая

`isValidName` — `name.trim().length > 0 && name.length <= 255`. То есть:

- пробелы в начале/конце — пропустятся (`.trim()` — только в проверке; `TEMPLATE_FOLDER_NAME` вырежет все пробелы и спецсимволы);
- emoji — пропустятся (в `title`), вырежутся (в `folderName`);
- HTML-теги — пропустятся (в `title`).

После создания пользователь увидит: `title: <b>Жирный</b>`, `folderName: Жирный` — и это «работает». Не критично (нет `escapeHtml` при записи в YAML), но шокирует.

### `calculateNextIndex` не учитывает уже существующие `folderName` с одинаковым индексом

`calculateNextIndex` ищет максимальный `sectionIndex` среди детей. Если дети проиндексированы — работает. Если у ребёнка `sectionIndex` не заполнен (пустая строка, `null`), он **пропускается**:

```js
if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
    …
}
```

Итог: если в родителе есть папка «Раздел1.Введение» с `sectionIndex: ''` (пользователь отредактировал вручную), `calculateNextIndex` её не увидит, вернёт `'1'` — и `section.Create` создаст «Раздел1.Новое», которое схлопнется с «Раздел1.Введение». `canCreateFolder` (в `createSectionFolder`) проверит `fs.existsSync` — папка «Раздел1.Новое» не существует, создание пройдёт. **Коллизия**: две папки с одинаковым префиксом индекса.

Не критично (секции не «сливаются»), но `sectionIndex` в `toc.yaml` будет дублироваться, `sortTocItems` выдаст неопределённый порядок.