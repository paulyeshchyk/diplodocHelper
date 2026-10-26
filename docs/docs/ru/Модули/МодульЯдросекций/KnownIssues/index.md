---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Два разных движка YAML

`sections.core` использует **два** пакета для работы с YAML:

- `yaml` (`YAML.stringify`) — в `yaml.base.js`, `yaml.toc.entry.js`, `yaml.toc.sort.js`. Форматирует с дефисами, отступами 2, без выравнивания по `:`.
- `js-yaml` (`yaml.dump`) — в `yaml.index.entry.js` (частично). Форматирует с `>`-многострочными строками.

Результат: `toc.yaml` и `index.yaml` могут иметь **разный стиль** после разных операций. Особенно заметно в `IndexYamlEntryPatchSection` (regex) vs `IndexYamlEntryPatch` (js-yaml.dump) — они могут давать разный вид одного и того же файла.

Практический эффект: если пользователь часто переименовывает секции, `index.yaml` мигает между двумя форматами. Не баг (синтаксис YAML валиден в обоих), но diff в git выглядит шумно.

### `TEMPLATE_FINAL_TITLE` и `composeFullTitle` — разная логика для одного результата

`TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title)`:

```js
if (!sectionValue || sectionValue.trim() === '') return title;
const leftPart = sectionIndex.trim().length === 0 ? sectionValue : `${sectionValue} ${sectionIndex.trim()}`;
return `${leftPart}. ${title}`;
```

`composeTitlePrefix(index, sectionType)`:

```js
const hasPrefix = !!sectionType.value;
const hasIndex = !!index;
if (hasPrefix && hasIndex) return `${sectionType.value} ${index}. `;
if (hasPrefix && !hasIndex) return sectionType.value;
if (!hasPrefix && hasIndex) return `${index}. `;
return '';
```

`composeFullTitle` → `prefix + pureTitle`.

Оба используются в `sections.core` (первый — в `yaml.base` и `md.index.file`, второй — в `diplodoc.flow` и командах). Разница: `TEMPLATE_FINAL_TITLE` **не добавляет точку после `sectionValue`**, если `sectionIndex` пуст. `composeFullTitle` — тоже (см. `hasPrefix && !hasIndex` → `return sectionType.value`, без точки). Совпадает.

Но если `sectionValue = 'Раздел'` (без пробела), `TEMPLATE_FINAL_TITLE` даст `"Раздел1. Введение"`, а `composeFullTitle` — `"Раздел 1. Введение"` (с пробелом). То есть один и тот же вход — разные результаты. Дублирование логики ведёт к рассинхронизации при правке одной функции.

### `isIndexedSectionType` не согласован с `FrontMatterSectionTypesIndexed`

В `frontmatter.section.title.js`:

```js
function isIndexedSectionType(sectionType) {
    return FrontMatterSectionTypesIndexed.includes(sectionType.name);
}
```

`FrontMatterSectionTypesIndexed` включает `Part`, `Section`, `Chapter`, **`Page`**. Но `Page` — статья, у неё нет `sectionIndex`, `isIndexedSectionType` для `Page` вернёт `true`. Используется в `section.Rename`:

```js
if (!isIndexedSectionType(newSectionTypeObj)) {
    finalIndex = '';
}
```

Для `Page` (статьи) `isIndexedSectionType` вернёт `true` — `finalIndex` не сбросится, что семантически неверно (статья не индексируется). В коде это компенсируется тем, что `promptSection` сам не запрашивает индекс для `Page` (проверяет `FrontMatterSectionTypesIndexed2`). Но `isIndexedSectionType` формально «врёт» для `Page`.

### `TocYamlEntryPatchReference` — простая `replace`

```js
content = content.replace(new RegExp(oldFolderName, 'g'), newFolderName);
```

`oldFolderName` — не escaped. Если в имени папки есть спецсимволы regex (`.`, `*`, `(`, `)`), замена сработает непредсказуемо. Имя папки `Раздел1.Введение` содержит `.` — `new RegExp('Раздел1.Введение', 'g')` трактует `.` как «любой символ». Замена `Раздел1.Введение` → `Раздел2.Новое` может «съесть» лишние символы.

Это **реальный баг** при переименовании. Правильно — `escapeRegExp(oldFolderName)`.

### `DiplodocSectionPatch` не удаляет старые `index.yaml`/`toc.yaml` при переименовании в другой тип

Если пользователь меняет `Статья → Раздел`, `TEMPLATE_FOLDER_NAME` даёт другое имя (`Введение` → `Раздел1.Введение`). `fs.renameSync` переносит **всю** папку, включая `index.yaml` и `toc.yaml`. `TocYamlEntryPatchTitle` переписывает `title` в `toc.yaml`, `IndexMdUpsert` переписывает `index.md`. Но `index.yaml` — только через `IndexYamlEntryPatch`, а тот использует regex по `title`/`description`. Если в старом `index.yaml` не было поля `pureTitle` (только `title`), `IndexYamlEntryPatchSection` не создаст `pureTitle`, а `IndexYamlEntryPatch` — создаст. Несогласованность между двумя функциями.

Практический эффект: после переименования `Статья → Раздел` в `index.yaml` может остаться неполный набор полей. Не критично (`@diplodoc/cli` не читает `pureTitle`), но `section.Rename` со временем накапливает «грязные» `index.yaml`.

### `getSectionMetadata` читает через `get()` — с `null` по умолчанию

```js
function getSectionMetadata(content) {
    return {
        sectionType: get(content, 'sectionType'),          // null если нет
        pureTitle: get(content, 'pureTitle') || get(content, 'title'),
        sectionIndex: get(content, 'sectionIndex'),        // null если нет
    };
}
```

Для статьи без `sectionType` — `null`. Для `String(null)` — `'null'`. В `reindexer.directories` это обрабатывается:

```js
const sectionTypeObj = localSectionTypes.find(st => st.name === metadata.sectionType) || DEFAULT_SECTION_TYPE;
```

`DEFAULT_SECTION_TYPE` — `Page`. То есть статья без `sectionType` попадёт в `Page`, не в ошибку. Работает, но `console.warn` о «не найден sectionType» не выводится (метаданные содержат `null` — `checkMissingSectionType` проверяет `!metadata.sectionType`, сработает).

### `sortTocItems` при `sortOrder = 'none'` — не сортирует, но перезаписывает файл

```js
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);
}
```

Проверка `sortOrder !== 'none'` стоит **перед** вызовом, но `sortTocItems` тоже пишет файл в любом случае. В `reindexDirectory` — правильно (проверка снаружи). Но если кто-то вызовет `sortTocItems(dir, 'none')` напрямую — получит `YAML.stringify`-нормализацию (не сортировку, но переформатирование). Не баг, но неочевидно.

### `getIndexFromBlock` в `yaml.toc.utils.js` — парсит блок из текста, а не YAML

```js
const hrefMatch = block.match(/href:\s+([^68]+)/);
```

Если `href` содержит `/` (`foo/bar/index.md`), match обрежется на `/` — вернёт `foo`. Эта функция, к счастью, **не используется** в текущем пайплайне (`TocYamlEntry*` работают через `YAML.parse`). Но если кто-то её вызовет — получит неверный результат. Мёртвый код с багом.