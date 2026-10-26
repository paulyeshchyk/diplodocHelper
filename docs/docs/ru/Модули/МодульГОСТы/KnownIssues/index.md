---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### Markdown-ссылки в карточках рендерятся как текст

`resolveMarkdownLinks` в `gosts.injector.js` переписывает URL (`.md` → `.html`, абсолютизирует), но оставляет markdown-синтаксис: `[text](url)`. Клиент (`gosts.js`) экранирует поля через `esc()`, который не трогает `[]()`. В итоге в карточке виден литерал `[text](/ru/foo.html)`, а не гиперссылка.

**Решение (в бэклоге):** добавить в клиент функцию `renderRichText`, которая экранирует HTML, а затем превращает `[text](url)` в `<a href>` — с проверкой схемы (`javascript:`, `vbscript:`, `data:` — блокировать) и добавлением `target="_blank" rel="noopener"` для внешних URL.

### Клик по ссылке открывает/закрывает карточку

`gosts.js` вешает `onRowClick` на `<tr>`; клик по вновь появившейся ссылке срабатывает и на ссылку, и на строку. После внедрения `renderRichText` нужно добавить в обработчик ранний выход:

```js
if (e.target.closest && e.target.closest('a')) return;
```

### `resolveMarkdownLinks` не обрабатывает абсолютные `.md`

Условие `if (mdPath.startsWith('http') || mdPath.startsWith('/')) return match;` пропускает ссылки от корня сайта: `[text](/ru/foo/bar.md)` останется с `.md`. Лечится отдельной веткой:

```js
if (mdPath.startsWith('/')) {
    return `[${linkText}](${mdPath.replace(/\.md$/, '.html')}${hash || ''})`;
}
```

### Клиентский скрипт копируется из `__dirname`

`gosts.injector.js` вызывает `fs.copyFileSync(path.join(__dirname, 'gosts.js'), ...)`. В исходниках клиентский скрипт лежит в `client/_assets/scripts/gosts.js`, а `gosts.js` в корне модуля — это Node-модуль генератора. Если в целевом артефакте (`dist/` или `plugins/`) `gosts.js` не подменён клиентской версией на этапе сборки — в браузер попадёт Node-код, таблица не отрисуется. Проверить, что копирование идёт из правильного источника.

### Ссылка на раздел — по имени папки

`findSectionIndexHtml` ищет папку по имени без учёта регистра, но `--section` должен совпадать с реальным именем папки (`ГОСТы`, а не `GOSTs`). Ошибка не диагностируется — просто `process.exitCode = 1` с сообщением «HTML файл не найден».