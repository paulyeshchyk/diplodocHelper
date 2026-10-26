---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Статус `excess` недостижим — легенда врёт

`getHelptagStatus` возвращает `excess` только если `count > 1`. Но `count` вычисляется как `hasHelptag ? 1 : 0` — всегда 0 или 1. То есть:

- `empty` — когда `helptag` пуст;
- `normal` — когда `helptag` непуст;
- `excess` — **никогда**.

При этом в легенде на странице отображается три цвета:

```
▮ >1 helptag       (color-excess)    ← не появляется ни разу
▮ Один helptag     (color-normal)
▮ Нет helptag (0)  (color-empty)
```

Пользователь видит «избыток» в легенде, но никогда не увидит ни одной плитки этого цвета. Вводит в заблуждение — кажется, что в проекте всё идеально, а на деле просто «избыток» не считается.

Ожидаемое поведение (по аналогии с `contextmap`): разбить `helptag` по запятой и считать число тегов. Тогда `>1 helptag` (например, `nomenclature, invoice`) даст `excess`, а строка без запятой — `normal`.

Починка — три строки:

```js
const parts = String(art.helptag || '').split(',').map(s => s.trim()).filter(s => s !== '');
const count = parts.length;
```

И `colorMap` уже содержит ключ `excess` — ничего больше не нужно.

### `ARTICLE_STATUS_I18N_TEXTS` содержит `excess` — «Без тэгов» / «Один тэг» / «Избыточно»

Третья запись (`excess: 'Избыточно'`) — мёртвая, потому что `excess` не назначается статьям. Согласовано с пунктом выше.

### «тэгов» с «э» — расхождение с общей терминологией

В `ARTICLE_STATUS_I18N_TEXTS.ru`:

- `empty: 'Без тэгов'` (с «э»);
- `normal: 'Один тэг'` (с «э»).

При этом везде в остальном коде и документации — «тег»/«теги» (без «э», калька с англ. `tag`). Мелочь, но в UI страницы пользователь видит «тэг» — это может сбивать при поиске по документации.

### `getTitle` показывает всю строку `helptag` без форматирования

```js
title += '\n' + art.helptag.trim();
```

Если `helptag: "nomenclature, invoice, report, dashboard"` — в `title`-подсказке плитки всё это выведется одной строкой. Длинный текст в тултипе. Не баг, но UX: можно было бы обрезать или форматировать по запятой.

### CLI-команда `periodicTableHelpTag` — «тихая»

`generateHelpTagPage` — синхронная функция без `return`-значения. В CLI:

```js
} else if (command === 'periodicTableHelpTag') {
    generateNavigationContent({ mapDir: outputDir, outputDir, command, docsDir });
}
```

`process.exitCode` не устанавливается. Если `app-help-contents.json` отсутствует, `generateGenericTableFromArticles` печатает `console.error('❌ File … was not found…')` и `return;` — `process.exitCode` остаётся `0`. То есть в `docs-build.js` шаг `periodicTableHelpTag` при отсутствии данных «успешно» завершится, но `helptagmap.html` не появится. См. `Pagebuilder.common.js`:

```js
if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File ${jsonPath} was not found. …`);
    return;   // ← без process.exitCode
}
```

Общее для всех трёх отчётов.

### Все ограничения `Pagebuilder.common` применимы

Как и к `bytescounter`/`contextmap`:

- «Глава» и «Раздел» — эвристика по префиксу имени папки;
- `lang: ['ru', 'en']` захардкожено;
- `preferredLang` в `localStorage` — общий для семейства;
- `navLinks` дублируются между отчётами.

### Отчёт «по наличию поля» — не «по качеству поля»

`helptagmap` показывает: `helptag` есть или нет. Не проверяет:

- **формат** — `helptag: "Nomenclature"` с заглавной, `helptag: "nomenclature "` с хвостовым пробелом, `helptag: "NOMENCLATURE"` (всё это — `normal` статус, хотя фронтенд может искать по нормализованному значению);
- **допустимость** — `helptag: "asdf-не-существует"` — тоже `normal`;
- **дубликаты** — если у двух статей одинаковый `helptag`, это не диагностируется.

Проверка `helptag` на валидность (если понадобится) — отдельная задача, ни `helpMap`, ни `helptags`, ни `helptagmap` её сейчас не решают.