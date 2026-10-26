---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `isTypeChanged` сравнивает label с name

```js
const currentSectionType = IndexMdEntryReadSectionType(oldFolderPath);   // 'Section'
const isTypeChanged = currentSectionType !== newSectionTypeObj.value;    // 'Раздел'
```

Никогда не равны (name vs label). `isTypeChanged` всегда `true` → `needSorting` всегда `true` → `sortTocItems` запускается при каждом переименовании, даже если тип и индекс не менялись.

Формально `sortTocItems` идемпотентна — если порядок уже правильный, файл перезаписывается с тем же содержимым. Но:

- лишняя работа на большом проекте (обход всех дочерних `index.md`);
- `toc.yaml` перезаписывается через `YAML.stringify` — форматирование может измениться (даже если семантически то же), diff в git шумный.

Правильно сравнивать `name` с `name`:

```js
const isTypeChanged = currentSectionType !== newSectionTypeObj.name;   // 'Section' vs 'Section'
```

### `TocYamlEntryUpdateOrAppend` вызывается с `finalFolderName = oldFolderName`

```js
let finalFolderName = oldFolderName;

TocYamlEntryUpdateOrAppend(
    parentDir,
    oldFolderName,
    fullTitle,
    finalFolderName,  // = oldFolderName
    …
);
```

Функция пишет `href: oldFolderName/index.md`, `include.path: oldFolderName/toc.yaml`. Запись в `toc.yaml` родителя получает новый `name` (`fullTitle`), но **старые** `href`/`include.path`. Это корректно на момент вызова (папка ещё не переименована), но:

- если `DiplodocSectionPatch` упадёт (например, `fs.renameSync` бросит `EXDEV`), `href` остаётся `oldFolderName/index.md`, `name` — `fullTitle`. То есть `toc.yaml` **уже** содержит «неконсистентное» состояние: имя новое, папка старая;
- если `DiplodocSectionPatch` вернёт **старое** имя при ошибке (см. следующий пункт), но папка фактически переименована — `href` в `toc.yaml` останется старым, а папка будет новой.

Правильный подход — сначала переименовать папку и получить **фактическое** имя, потом обновлять `toc.yaml`. Или — использовать транзакционность (временная папка, откат при ошибке).

### `DiplodocSectionPatch` возвращает старое имя при ошибке, но папка может быть уже переименована

```js
try {
    fs.renameSync(folderPath, newFolderPath);                   // ← папка уже новая
    TocYamlEntryPatchReference(parentDir, oldFolderName, newFolderName);
    TocYamlEntryPatchTitle(newFolderPath, composedTitle);
    IndexYamlEntryPatch(newFolderPath, …);                      // ← если это упадёт…
    IndexMdUpsert(newFolderPath, …);
    return newFolderName;
} catch (err) {
    console.error(…);
    return oldFolderName;                                        // ← но вернём старое имя!
}
```

Если `fs.renameSync` успешен, но следующий шаг (`TocYamlEntryPatchReference` или `IndexYamlEntryPatch`) бросает — `catch` возвращает `oldFolderName`. В `ux_section_rename`:

```js
finalFolderName = DiplodocSectionPatch(...);   // = oldFolderName
finalFolderName = path.basename(finalFolderName);  // = oldFolderName
// …
const effectiveNewPath = path.join(parentDir, finalFolderName);  // = oldFolderPath
await updateLinksAfterRename(oldFolderPath, oldFolderPath, projectRoot, …);  // ← no-op
```

Ссылки в проекте остаются указывать на `oldFolderPath`, но папка физически уже в `newFolderPath`. Сборка `@diplodoc/cli` упадёт на всех ссылках.

Правильно:

- при ошибке — попытаться откатить `fs.renameSync(newFolderPath, folderPath)` в `catch`;
- или вернуть `newFolderName` (папка уже переименована) и сообщить об ошибке на конкретном шаге, оставив пользователю право доделать вручную.

Сейчас — самое опасное место в модуле.

### `TocYamlEntryPatchReference` — regex без экранирования

```js
content = content.replace(new RegExp(oldFolderName, 'g'), newFolderName);
```

`oldFolderName` может содержать `.` (`Раздел1.Введение`), `(` `)` `[` `]` `+` `*` `?` `{` `}` (не должно, но `isValidName` их пропускает, а `TEMPLATE_FOLDER_NAME` вырезает только буквы/цифры — так что на практике только точки и дефисы). Из них `.` — метасимвол regex. `Раздел1.Введение` под regex матчит `Раздел1XВведение`, `Раздел1 Введение` и т.д.

Реальный сценарий: в `toc.yaml` родителя есть комментарий `# Раздел1XВведение — старый`, где `X` — любая буква, случайно попавшая под `.`. После замены станет `# Раздел2XНовое` — испорченный комментарий.

Более вероятно: `Раздел1.Введение` содержит `.`, и если в `toc.yaml` есть `# Раздел1_Введение` (с `_` вместо `.`) — regex **не** сматчит (`_` ≠ `.` в буквальном сравнении, но `.` в regex матчит `_`). То есть `# Раздел1_Введение` **будет** заменено на `# Раздел2_Новое`. Неверно.

Фикс — `escapeRegExp(oldFolderName)`:

```js
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
content = content.replace(new RegExp(escapeRegExp(oldFolderName), 'g'), newFolderName);
```

### `IndexYamlEntryPatchHRef` при `composedTitle = ''` опустошает `title`

```js
// In TocYamlEntryPatchReference:
IndexYamlEntryPatchHRef(parentDir, oldFolderName, newFolderName, '');
```

```js
// In IndexYamlEntryPatchHRef:
const selfRegex = new RegExp(`(\\s*-\\s+title:\\s*)([^32]+)(\\n\\s+href:\\s+)${oldFolderName}/index\\.md`, 'g');
content = content.replace(selfRegex, `$1${composedTitle}$3${newFolderName}/index.md`);
```

Если в `index.yaml` родителя есть запись вида:

```yaml
- title: Старое название
  href: Раздел1.Введение/index.md
```

— она превратится в:

```yaml
- title: 
  href: Раздел2.Новое/index.md
```

`title` опустеет. Формально `IndexYamlEntryPatchHRef` в `Rename` не имеет полного `composedTitle` (он не передан из `TocYamlEntryPatchReference`), но `IndexYamlEntryPatch` (другой шаг, для самой секции) уже установил `title` в `index.yaml` **внутри** секции. А этот — про `index.yaml` **родителя**, где может быть список детей.

В стандартной структуре Diplodoc `index.yaml` родителя не содержит списка детей (дети — в `toc.yaml`). Так что регексп `selfRegex` обычно не сматчит ничего — no-op. Но если пользователь вёл ручной список в `index.yaml` родителя — `title` опустеет.

### `IndexYamlEntryPatchSection` (regex) не добавляет `pureTitle` если его нет

```js
content = content.replace(/^pureTitle:.*/m, `pureTitle: ${pureTitle}`);
```

Если в `index.yaml` **нет** строки `pureTitle:` (пользователь создал статью без этого поля), regex не сматчит, строка не добавится. `index.yaml` останется без `pureTitle`. При следующем `Rename` (или `reindexer.directories`) это снова не добавится (regex не матчит).

Между тем `DiplodocSectionPatch` → `IndexYamlEntryPatch` (js-yaml) — **добавляет** `data.pureTitle = newPureTitle`. То есть после `Rename` со сменой папки `pureTitle` появится, а после `Rename` без смены папки — не появится. Несогласованность.

### `uri` из палитры — тихий выход

`if (!uri) return;` — как и в других `section.*`. Команда видна в палитре, но не работает без выделения папки.

### `promptSectionIndex` — `Escape` не отменяет

```js
userIndex = (await promptSectionIndex(currentIndex)) ?? '';
```

Если пользователь нажал `Escape` — `userIndex = ''`, `finalIndex = ''`. `composeFolderName('', type, title)` → папка без индекса (`Раздел.Введение`). Пользователь ожидал отмены, получил «секцию без индекса».

Правильно:

```js
const raw = await promptSectionIndex(currentIndex);
if (raw === undefined) return null;  // отмена
userIndex = raw;
```

### `updateLinksAfterRename` вызывается даже когда папка не переименована

Если `newFolderName === oldFolderName` (только `pureTitle` изменился, а `sectionIndex` и `sectionType` — нет), `effectiveNewPath === effectiveOldPath`. `updateLinksAfterRename` обходит все `.md` в проекте, но `transform` для «своих» возвращает тот же путь → `updateLinksInContent` пересобирает ссылки с тем же относительным путём → `newContent === content` → файлы **не** перезаписываются.

То есть на выходе — ничего не меняется, но время потрачено. На проекте с тысячей `.md` — секунды. Стоит добавить проверку `if (effectiveOldPath !== effectiveNewPath) await updateLinksAfterRename(...)`.

### `updateLinksAfterRename` глотает ошибки

Та же проблема, что в [`section.Delete`](../МодульУдалениесекции/index.md) и [`section.Move`](../МодульПеремещениесекции/index.md): `updateLinksInProject` ловит `try/catch` на каждом файле, `console.warn` в консоль, цикл продолжается. Внешний `catch` в `ux_section_rename` **не сработает** — модуль «успешно» переименует, но некоторые файлы останутся со старыми ссылками.

Общий фикс — в `links.md`: пробрасывать ошибки наружу (или возвращать `{ changed, errors }` и показывать предупреждение).

### `rename.error.interrupted` — только в консоль

```js
if (!newSectionObject) {
    console.log(translate(nls_ts.plugin.section.rename.error.interrupted));
    return;
}
```

NLS: `"object will not be renamed: input cancelled"` (странная формулировка с `object` вместо «секция»). Пользователь, нажавший `Escape` на первом диалоге, не видит **никакого** сообщения — только `console.log` в Developer Tools расширения. UX-проблема.

Правильно — либо `showInformationMessage('Переименование отменено')`, либо ничего не логировать (отмена — нормальное действие).

### Сообщение об успехе повторяет имя, если оно не изменилось

Если только `pureTitle` изменилось (`Раздел1.Введение` → `Раздел1.Начало` — стоп, `newFolderName = 'Раздел1.Начало'`, папка переименуется). А если `pureTitle` не изменилось, а только `sectionType` (Section → Chapter с тем же `value`... нет, `value` разный — `Раздел` vs `Глава`) — папка переименуется.

Случай, когда папка **не** переименовывается — только «нажали Rename и подтвердили всё как было» (тип тот же, имя то же, индекс тот же). Тогда сообщение: `«Раздел переименован: «Раздел1.Введение» → «Раздел1.Введение»»` — странно.

Починка — проверять `oldFolderName === finalFolderName` и выводить «Раздел обновлён» без стрелки, либо перейти на `fullTitle` (текстовое название) в сообщении.

### `needSorting` — сортировка всегда (из-за `isTypeChanged`)

Уже описано в первом пункте. Второй эффект: `sortTocItems(parentDir)` использует `IndexMdEntryReadIndex` для каждой дочерней секции. Если какая-то дочерняя секция была повреждена (`index.md` не имеет `sectionIndex`), она попадёт в `nonIndexed` и уедет в конец списка. Это «правильно» по дизайну `sortTocItems`, но если раньше в `toc.yaml` она стояла в середине — пользователь увидит неожиданное «переехало в конец» после переименования **другой** секции.

### `isIndexedSectionType` включает `Page` — мёртвая ветка

```js
if (!isIndexedSectionType(newSectionTypeObj)) {
    finalIndex = '';
}
```

Для `Page` (`name: 'Page'`) — `isIndexedSectionType` возвращает `true` (потому что `FrontMatterSectionTypesIndexed` включает `Page`). То есть `finalIndex` **не** обнуляется. Но для `Page` `promptSection` не запрашивает индекс, `userIndex = ''`, `finalIndex = ''`. Уже пустой.

Для `Part`/`Section`/`Chapter` — `true`, `finalIndex` остаётся. `promptSection` запрашивает индекс. Всё согласовано.

То есть `if (!isIndexedSectionType(...))` — **никогда** не срабатывает в текущем коде. Мёртвая ветка. Семантически `Page` **не** должна быть в `FrontMatterSectionTypesIndexed` — это должна быть «не индексируется». Но так как ветка не работает, баг компенсирован.

### `IndexYamlEntryPatch` (js-yaml) и `IndexYamlEntryPatchSection` (regex) дают разный результат

В `DiplodocSectionPatch` используется `IndexYamlEntryPatch` (через js-yaml, полная перезапись). В `DiplodocSectionRefresh` — `IndexYamlEntryPatchSection` (regex, точечные правки).

После `Rename` со сменой папки — `index.yaml` переформатирован (потеря комментариев). После `Rename` без смены папки — сохранён (комментарии на месте). Несогласованность между двумя ветками.

Фикс — перейти на единый подход (regex везде или js-yaml везде). Regex — предпочтительнее (сохраняет комментарии).

### `TocYamlEntryUpdateOrAppend` обновляет только первую запись

Если в `toc.yaml` родителя запись на секцию встречается **дважды** (например, пользователь случайно продублировал), обновится только первый. Второй останется со старым `name`. После сборки — две ссылки на одну папку с разными названиями. Маловероятно, но возможно.

### Нет `withProgress` на `updateLinksAfterRename`

`await updateLinksAfterRename(...)` — обход всех `.md` без индикатора. На большом проекте — секунды «задумчивости» VS Code. Пользователь не понимает, что происходит.

### Неатомарность и отсутствие rollback

Если `DiplodocSectionPatch` упадёт на середине — папка уже переименована, `index.md`/`index.yaml`/`toc.yaml` могут быть частично обновлены, `toc.yaml` родителя может содержать неконсистентные `name`/`href`. Откат — вручную.

Правильный подход — сохранять «снимок» файлов перед операцией, при ошибке — восстанавливать. Или — работать через временную папку: `fs.renameSync(old, old.tmp)` → правки → `fs.renameSync(old.tmp, new)`. Если что-то упало — `fs.renameSync(old.tmp, old)` возвращает исходное состояние.

Сейчас — нет.