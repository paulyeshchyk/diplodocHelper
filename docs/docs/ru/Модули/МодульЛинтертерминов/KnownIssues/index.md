---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

Все ограничения [`linter.abbrs`](../МодульЛинтераббревиатур/index.md) применимы здесь, за исключением нюансов ниже.

### `<abbr class="term">` внутри код-блоков — ложные срабатывания

`lintFile` не маскирует код-блоки перед regex. Если в примере кода:

````markdown
```html
<abbr class="term">Пример</abbr>
```
````

и в `terms.yaml` нет «Пример» — линтер покажет «не найдено», хотя это **пример кода**. `terms.extractor.extractTermsFromFile` использует `maskCodeInMarkdown` — линтер **не** использует. Расхождение.

### `<abbr class="term">` с `data-term` и без — считаются по-разному

`lookupTerm = dataTerm || innerText`:

- `<abbr class="term" data-term="Абстракция">абстракций</abbr>` — проверяется `Абстракция`;
- `<abbr class="term">Абстракция</abbr>` — проверяется `Абстракция`.

Оба варианта допустимы. Линтер корректно проверяет `data-term`, если он есть. Но если `data-term` содержит опечатку (`data-term="Абстрацкия"`), а `innerText` правильный — линтер проверит `Абстрацкия` и покажет «не найдено», хотя пользователь имел в виду `Абстракция` из `innerText`.

### `resolveDocsRoot` дублируется

`linter.abbrs` и `linter.terms` содержат **идентичную** реализацию `resolveDocsRoot` в своих `*.linter.js` (файлы `src/commands/diplodoc-helper.linter.abbrs.js` и `...terms.js`). Дублирование в двух местах. При изменении (например, поиск `docs` по regex, или работа с мульти-workspace) — править в двух файлах.

### `title=` — не проверяется

Если у `<abbr class="term" title="…">` есть `title`, линтер его **пропускает**. Предполагается, что `title` — inline-override «я знаю, что делаю». Но это означает: пользователь может поставить `title="Абстракция"` и обойти линтер, хотя в словаре термина нет. Тултип от `terms.injector` **тоже** будет не от словаря, а от `title` — но на странице «Список терминов» записи не будет.

### `languages: ['ru', 'en']` — захардкожено

Как и в `linter.abbrs`. `lintTerms` принимает `options.languages`, но VS Code-команда не передаёт. Третий язык не проверяется.

### `SKIP_DIRS` — копия

```js
const SKIP_DIRS = new Set(['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);
```

Список тот же, что у `linter.abbrs`, но **порядок другой** (`terms` первым). В JS `Set` порядок не важен для `has`, но копипаст заметен.

### `withProgress` без `cancellable`

Как и `linter.abbrs`. На большом проекте — нельзя отменить.