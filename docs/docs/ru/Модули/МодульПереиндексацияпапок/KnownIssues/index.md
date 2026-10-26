---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### `FrontMatterSectionTypesIndexed` включает `Page` — Page ошибочно получает индекс

В `model/frontmatter.model.js`:

```js
const FrontMatterSectionTypesIndexed = [
    FrontMatterSectionTypes.PART,
    FrontMatterSectionTypes.SECTION,
    FrontMatterSectionTypes.CHAPTER,
    FrontMatterSectionTypes.PAGE,     // ← Page
];
```

`reindexAndRenameSection` использует **этот** список (не `Indexed2`), поэтому `Page` попадает в ветку «индексируется». `hadManualIndex = !!currentIndex` — у Page `currentIndex = ''`, `hadManualIndex = false`, `localCounter++`, `currentIndex = parentIndex.N`. То есть **статья получает индекс**.

Симптом: `index.md` статьи (`title: Введение`, без `sectionIndex`) после реиндексации получает `sectionIndex: '1'`, `title: Статья 1. Введение`, папка переименовывается в `1.Введение`.

Фикс — использовать `FrontMatterSectionTypesIndexed2` (без `Page`):

```js
if (FrontMatterSectionTypesIndexed2.includes(sectionType)) { … }
```

Это одна строка.

### `TocYamlEntryPatch` правит `tocDoc` в памяти, но `sortTocItems` перечитывает с диска

Порядок:

1. `reindexAndRenameSection` → `TocYamlEntryPatch(tocDoc, sectionName, newTitle)` — правит `tocDoc.name` в памяти.
2. `sortTocItems(dir, …)` — **заново** `TocYamlFileLoad(tocPath)` с диска. Правки `tocDoc` **теряются**.

То есть `name` в `toc.yaml` родителя **не обновляется** после переименования секции. Пользователь видит в `toc.yaml` старое имя (`Раздел1.Введение`), а папка уже `Раздел2.Архитектура`. При следующей сборке `@diplodoc/cli` покажет устаревшее имя.

Фикс — либо сохранять `tocDoc` перед `sortTocItems` (`TocYamlFileSave`), либо передавать `tocDoc` в `sortTocItems`.

### `sortTocItems` вызывается **после** каждой рекурсии

Структура:

```js
for (const section of sections) {
    const result = reindexAndRenameSection(...);
    const childWarnings = reindexDirectory(result.sectionPath, ...);   // рекурсия
    // ...
}
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);                            // сортировка
}
```

Сортировка — **после** всего цикла (включая рекурсию). То есть сначала обходятся все дети (с их сортировками), потом сортируется **этот** `toc.yaml`. Логически правильно, но:

- `reindexDirectory` возвращает после рекурсии — `tocDoc` родителя уже в памяти (с правками), но `sortTocItems` его не использует;
- каждая рекурсия делает свой `sortTocItems` для дочернего `toc.yaml`.

Итог: для дерева из 50 секций — 51 вызов `sortTocItems`, каждый читает+пишет `toc.yaml`. Медленно, но работает.

### `localCounter` не сохраняется между рекурсиями

`localCounter` — локальная переменная в `reindexDirectory`. После обхода всех секций и рекурсии — не сохраняется нигде. При повторном вызове `reindexDirectory` на той же папке — начинается с 0.

Практически работает: `localCounter` используется только внутри одного вызова. Но если пользователь запускает реиндексацию дважды (например, отменил, потом снова), второй запуск пересчитает индексы с нуля, что может привести к другим номерам (если `metadata.sectionIndex` уже обновлён, `localCounter = max(localCounter, lastNum)` — правильно).

### `DiplodocSectionPatch` возвращает старое имя при ошибке (та же проблема, что в `section.Rename`)

```js
try {
    fs.renameSync(folderPath, newFolderPath);
    // … много правок …
    return newFolderName;
} catch (err) {
    console.error(`❌ Не удалось переименовать ${oldFolderName}:`, msg);
    return oldFolderName;
}
```

Если `fs.renameSync` успешен, но следующая правка бросит — `catch` вернёт **старое** имя, а папка уже переименована. `reindexDirectory` продолжит с `result.sectionPath = path.join(dir, oldFolderName)` — несуществующий путь. Рекурсия `reindexDirectory(result.sectionPath, …)` вызовет `fs.readdirSync` на несуществующем пути → `throw ENOENT`.

Симптом: реиндексация падает на середине с `ENOENT`, часть папок переименована, часть — нет, `toc.yaml` в неконсистентном состоянии.

Фикс — как в `section.Rename`: откат `fs.renameSync` при ошибке или возврат фактического имени.

### `IndexMdUpsert` вызывается **до** `DiplodocSectionPatch`

```js
IndexMdUpsert(oldSectionPath, pureTitle, sectionType, sectionLabel, currentIndex);
const newFolderName = DiplodocSectionPatch(oldSectionPath, pureTitle, sectionTypeObj, currentIndex);
```

`IndexMdUpsert` правит `index.md` по **старому** пути. Потом `DiplodocSectionPatch` переименовывает папку (с `index.md` внутри). Внутри `DiplodocSectionPatch` ещё раз вызывается `IndexMdUpsert` (по новому пути). То есть `index.md` правится **дважды** — второй раз перезаписывает первый. Лишняя работа, но не баг.

### `warnings` не удаляются после показа

`ux_reindex_directories`:

```js
if (allWarnings.length > 0) {
    showWarnings(allWarnings);
}
```

`showWarnings` показывает модальный диалог. После закрытия — `allWarnings` остаётся в переменной (не используется). При следующем вызове — новый пустой `allWarnings`. Не баг, но при отладке `console.log(allWarnings)` после — покажет старые.

### `checkMissingSectionType` — пустой `sectionType` = `null`, а не `''`

```js
function checkMissingSectionType(metadata, sectionPath, warnings) {
    if (!metadata.sectionType || metadata.sectionType.trim() === '') {
        // …
    }
}
```

`metadata.sectionType = null` (из `getSectionMetadata`). `!null` → `true`, warning сработает. Правильно.

Но `metadata.sectionType.trim()` при `null` — `TypeError`. Не выполнится, потому что `!metadata.sectionType` — `true` (short-circuit). Ок.

### `checkTitleHasPrefix` — только по префиксу

```js
const prefixes = ['Часть', 'Раздел', 'Глава'];
for (const prefix of prefixes) {
    if (title.startsWith(prefix + ' ') || title.startsWith(prefix + '.')) {
        warnings.push({ type: 'titleHasPrefix', … });
        break;
    }
}
```

Если `title` начинается с `Раздел 1. Введение` (есть пробел после `Раздел`) — сработает. Если `Раздел1.Введение` (без пробела) — **не сработает** (не начинается с `'Раздел '` или `'Раздел.'`). Пользователь не увидит warning, хотя `pureTitle` не извлечён и `DiplodocSectionPatch` будет использовать `basename` как `pureTitle`.

### `sortTocItems` не вызывается, если `toc.yaml` не существует

```js
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);
}
```

`tocDoc` — `null`, если `toc.yaml` нет. Секции переименуются, но порядок в родителе — «как был» (или, если `toc.yaml` не было, вообще не появится).

Если у родителя нет `toc.yaml`, но есть дети — это «невалидный» Diplodoc-проект. Модуль не падает, но и не создаёт `toc.yaml`.

### Нет CLI — только VS Code

`reindexDirectories` недоступен из командной строки. В `docs-build.js` его нет. Это интерактивная операция (нужно выбрать папку), но для CI (например, при деплое) автоматизация невозможна.

Можно было бы добавить `cli('reindexDirectories', '--docsDir', './docs/ru')` в `docs-build.js` (как `reindexFigures`), но это переиндексирует всю документацию при каждой сборке — возможно, не то, что хотят пользователи.

### `showInformationMessage` — всегда «успех», даже с warnings

```js
vscode.window.showInformationMessage(translate(nls_ts.plugin.section.reindex.info.success));
if (allWarnings.length > 0) showWarnings(allWarnings);
```

Сначала «Переиндексация завершена!», потом модальное с warnings. Пользователь видит «успех», а потом список проблем. Логичнее — сначала warnings (если есть), потом «успех» (или вместо). Или — одно сообщение с контекстом.

### `reindexDirectory` не логирует число обработанных секций

Только `console.log` на каждую папку (`Переиндексация: <path>`) и на каждую секцию (`auto index <N> - <folder>` / `manual index <N>`). Для 50 секций — 100+ строк лога. Мелочь, но в DevTools Console шумно.

### `getSectionMetadata` возвращает `sectionIndex: null`, `String(null || '') = ''`

```js
let currentIndex = String(metadata.sectionIndex || '').trim();
```

`metadata.sectionIndex = null` → `null || '' = ''` → `String('') = ''`. Правильно.

`metadata.sectionIndex = 0` (число) → `0 || '' = ''` → `String('') = ''`. **Баг**: если `sectionIndex: 0` (число в frontmatter, что валидно для `Раздел 0`), `0 || ''` даст `''`. Индекс потеряется, сработает auto-индексация (`1`, `2`, …). Секция с номером `0` превратится в `1`.

### `metadata.pureTitle || sectionName`

```js
const pureTitle = metadata.pureTitle || sectionName;
```

Если `pureTitle: ''` (пустая строка), fallback на `sectionName` (имя папки). Приемлемо, но `''` — валидный `pureTitle`? Скорее нет. `||` не различает `''` и `null` — оба дадут `sectionName`.