---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Коллизия анкоров при транслитерации

`termAnchorId(term)` и `termOccurrenceId(term, n)` строятся как `term-<slugify_latin_alphanumeric(term)>[-N]`. Два разных термина с одинаковой транслитерацией (`Ёж` и `Yozh`) дадут одинаковый анкор.

### `showWarnings` и `showUnused` выключены

В `terms.config.js` `showWarnings: false`, `showUnused: false`. Баннер «Нет в словаре» и метка «В статьях не используется» не появятся, пока не поправить конфиг.

### Выходная папка задаётся только через `terms.paths.yaml`

Путь `Дополнительнаяинформация/Терминыиопределения` (ru) / `Additional information/Terms and definitions` (en) фиксирован. CLI-аргумента нет.

### Требуется `class="term"` — иначе термин «выпадает»

`<abbr>` без `class="term"` не попадёт ни в индекс, ни в тултипы. Линтер `terms` его не увидит; его подхватит линтер `abbrs` (фильтр ровно противоположный — «без `class=`»). Диагностики на путаницу нет.

### Линтер чувствителен к регистру

`data-term="Абстракция"` не совпадёт с `term: абстракция` в словаре.

### Дублирование `shared/*` с `abbrs`

Папки `src/plugins/abbrs/shared/` и `src/plugins/terms/shared/` содержат идентичный код. Осознанное решение (независимое распространение модулей), но любая правка должна дублироваться.
