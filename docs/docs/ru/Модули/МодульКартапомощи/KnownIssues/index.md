---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### VS Code-команда — «мёртвая»

`diplodoc-helper.helpMap.Generate.js` не экспортирует `ux_helpmap_generate` (файл содержит только `require`-блок). В `commands/index.js` хендлер получает `undefined`. Команда зарегистрирована в `package.json`, но вызов ничего не делает (или падает с ошибкой регистрации — зависит от версии VS Code).

Два способа починить:

- **быстро** — добавить в файл настоящую реализацию, по образцу `diplodoc-helper.context.Generate.js`;
- **чисто** — удалить `diplodoc-helper.generateHelpMaps` из `package.json` и `commands/index.js`, оставив генерацию только через CLI (как `gosts`, у которого нет VS Code-команды для полной регенерации).

### `segregation` не используется в пайплайне

`docs-build.js` вызывает `cli('helpMap')` **без** флага `--segregation`. Значит, `build/<lang>/app-help-contents.json` в стандартной сборке не создаются, хотя код для этого есть. Все потребители читают `build/app-help-contents.json` — общий массив с обоими языками, каждый потребитель сам фильтрует по `item.lang`.

Если `segregation: true` включить, появятся дополнительные файлы, но `contentNavigator` и `context-search` всё равно читают не их, а общий. Двойной источник правды — потенциальный баг, если один из файлов окажется неактуальным.

### `getParentTitles` ломается на одноимённых папках

```js
const parentDir = path.join(docsDir, ...parts.slice(0, startIdx + parentParts.indexOf(parent) + 1));
```

`parentParts.indexOf(parent)` ищет **первое** вхождение по имени. Для `docs/ru/foo/bar/foo/article.md`:
- `parts` = `['ru', 'foo', 'bar', 'foo', 'article.md']`, `startIdx = 1`;
- `parentParts` = `['foo', 'bar', 'foo']`;
- первая итерация: `parent = 'foo'`, `indexOf = 0`, `parentDir = docs/ru/foo`. Правильно.
- вторая итерация: `parent = 'bar'`, `indexOf = 1`, `parentDir = docs/ru/foo/bar`. Правильно.
- третья итерация: `parent = 'foo'`, `indexOf = 0` (первое вхождение!), `parentDir = docs/ru/foo`. **Неправильно** — должно быть `docs/ru/foo/bar/foo`.

В итоге `parents` для статьи в `docs/ru/foo/bar/foo/article.md` получит заголовок из `docs/ru/foo/index.md` вместо `docs/ru/foo/bar/foo/index.md`.

Правильно было бы использовать индекс в массиве (`parentParts.forEach((parent, i) => …)`), а не `indexOf`.

### `size` — размер `.md`, не HTML

Поле `size` в JSON — это размер исходного Markdown-файла. Потребители (`contentNavigator`, таблица размеров) читают его как «размер статьи», но это **не** размер итогового HTML. Если на странице много `{% cut %}`, картинок, таблиц — HTML может быть в 3–10 раз больше. Сравнивать «размеры статей» по этому полю между собой можно, а вот экстраполировать на «вес страницы» — нельзя.

### `title` может быть пустым

`title: title.trim() || defaultTitleValue` (где `defaultTitleValue: ''`) — если в frontmatter нет ни `title`, ни `pureTitle`, в JSON уйдёт пустая строка. Потребители (`contentNavigator`, `context-search`) такое отфильтровывают, но в самом JSON запись с пустым `title` есть.

### `hint`, `helptag`, `context` не нормализуются

Все три поля берутся как есть: `.trim()` и всё. `context: "breadcrumb, post-processing"` останется строкой с запятой. Разбиение на массив — задача потребителя. `helpMap` не проверяет ни формат, ни допустимые значения (опечатка в `helptag` попадёт в JSON без предупреждения).

### `data.hint?.trim()` — молчаливый `undefined`

```js
hint: data.hint?.trim() || defaultHintValue,
```

Если в frontmatter `hint: 42` (число), `42?.trim()` выбросит `TypeError` — `trim` не функция. В `try/catch` файла это ловится, но файл целиком пропускается (`failed.push(fullPath)`). То есть одна «неправильная» статья выкидывает всю её метаинформацию из `app-help-contents.json` без явного предупреждения пользователю (только в `console.error`).