---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Только `ru` в `docs-build.js`

По аналогии с `footnotes`. Английская документация не обрабатывается — нумерация сносок в `en/` останется «с нуля на каждой странице». Если нужно и для `en`, добавляется второй `cli('footnoteNumbering', '--docsDir', './docs/en', '--outputDir', './build')` или модуль делается мультиязычным.

### Порядок сносок определяется `toc.yaml`

Если `.md` не упомянут в `toc.yaml` (или `toc.yaml` отсутствует), порядок файлов берётся из `collectMdFilesByToc`-fallback — обход `fs.readdirSync`, без навигации. В этом случае сквозная нумерация всё равно работает, но порядок файлов непредсказуем (зависит от ОС и версии `fs.readdirSync`). Документация без `toc.yaml` — сценарий нетипичный, но возможный (модуль `helpmap`, например, работает и без `toc`).

### «Болтающиеся» сноски в файлах без `toc`

`if (!fs.existsSync(htmlPath))` — если `.md` есть, но `.html` нет (файл исключён из `@diplodoc/cli`-сборки, например, через `.yfmignore`), сноски в нём не нумеруются. В `console.warn` будет `[footnotes] HTML не найден для …`.

### Регулярка `(fnref|fn)(\d+)\b` — совпадения в произвольном тексте

`\b` стоит только в конце, но не в начале. Поэтому `myfn1` — если такое встретится в тексте — будет переименовано в `myfn4` (при offset = 3). Реальный шанс — нулевой (кто пишет `myfn1` в документации?), но теоретически модуль не «привязан» к `id=`/`href=`. Любое `fn<digits>` в тексте или CSS-классе будет перенумеровано.

То же с `[N]</a>` — ловит `[1]</a>` в любом `<a>`, не только footnote-ref. На практике совпадений нет, потому что `[N]</a>` — очень характерный паттерн для сносок.

### `\b` без `\b` в начале — уже упомянуто

В предыдущем пункте. Отмечу ещё раз для аккуратности.

### `<ol>` в state JSON — вероятно, регулярка мёртвая

```js
newHtml = newHtml.replace(
    /&lt;ol(\s[^45]*?class=\\"footnotes-list\\"[^45]*?)&gt;/g,
    …
);
```

Регулярка ищет `<` → `&lt;`, `"` → `\"`. Это форма «HTML-entity + JSON-escape». В реальном выводе `@diplodoc/cli` `<ol>` внутри `<script id="diplodoc-state">` хранится либо как `<ol class=\"footnotes-list\">` (JSON-escape без HTML-entities — это JSON-строка, `<` не нужно экранировать), либо как `&lt;ol class=\"footnotes-list\"&gt;` (если проект использует `jsonEscapeHtmlForDiplodoc`-подобное экранирование — так делают наши собственные инжекторы `abbrs` / `terms` / `gosts`).

Если `@diplodoc/cli` использует только JSON-escape (что верно для стандартного Diplodoc), то в файле будет `<ol class=\"footnotes-list\" start=\"N\">` — **без** `&lt;` и `&gt;`. Эта форма **не ловится** ни первой регуляркой (`<ol(\s[^46]*class="footnotes-list"…)` — ждёт `class="…"` с обычными кавычками), ни второй (`&lt;ol` — ждёт HTML-entities).

В итоге `start` и `counter-reset` в state-JSON `<ol>` **не обновляются**. К счастью, на рендер это не влияет: браузер берёт HTML из state, но числа в сносках формируются CSS-счётчиком, который сам инициализируется через `counter-reset`. Если `counter-reset` в state-JSON не обновлён — счётчик может «съехать» после гидратации.

Проверить в DevTools на второй странице с offset > 0:

```js
// В state (если hydrate):
JSON.parse(document.getElementById('diplodoc-state').textContent).data.html
// Ищем там <ol class=\"footnotes-list\" — есть ли start= и style=?
```

Если `start` там не обновлён, а `counter-reset` тоже — то после hydrate сноски могут отобразиться с локальными номерами, перебивая глобальные. Решение — добавить третью регулярку:

```js
newHtml = newHtml.replace(
    /<ol(\s[^46]*class=\\"footnotes-list\\"[^46]*?)>/g,
    (m, attrs) => `<ol${upsertStyle(attrs, styleDecl, true)}>`
);
```

(с `class=\\"footnotes-list\\"` — JSON-escape без HTML-entities.)

### `counter-reset` не работает без CSS

Модуль добавляет `style="counter-reset: hier-list-item N"` — но работает это только если CSS темы Diplodoc использует именно `hier-list-item` в `li::before { counter-increment: hier-list-item; content: "[" counter(hier-list-item) "] " }` (или похожее). Если тема сменит имя счётчика — стиль станет «мёртвым атрибутом», а отображаемые номера снова станут локальными. Симптом: `start="4"` в HTML, но визуально `[1]`.

### `total` ≠ `changed`

`total` в результате — сумма `count` по всем файлам (общее число сносок). `changed` — число изменённых файлов. В CLI ни то, ни другое не выводится (только логи `[footnotes] Готово. Всего сносок: N, изменено файлов: M`). Если нужно реагировать программно — придётся ловить stdout.

### `.yfm`-настройки не учитываются

Модуль не читает `diplodoc-helper.*` из конфига. Никаких «включить/выключить», никакого выбора языка. Только аргументы CLI. Если пользователь хочет отключить сквозную нумерацию для конкретного проекта — только через `--skip=footnoteNumbering` в `docs-build.js`.