---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `docs-build.js` — `tocCleanMode` в фазе `pre` (критический баг)

```js
pre: [
    run('clean build', …),
    cli('reindexFigures', '--docsDir', './docs/ru'),
    cli('reindexFootnotes', '--docsDir', './docs/ru'),
    cli('helpMap'),
    cli('tocCleanMode'),    // ← ЗДЕСЬ. На пустом build/.
    cli('periodicStat'),
    …
],
```

`injectCleanMode` вызывается **до** `@diplodoc/cli`. На пустом `build/` (после `clean build`) — `files = []`, ничего не инжектится. `@diplodoc/cli` создаёт HTML, но скрипт **не** встроен.

**Режим не работает** при стандартной сборке через `docs-build.js`.

Правильно — перенести в `post:`, после `@diplodoc/cli`:

```js
post: [
    cli('footnoteAnchors', './build'),
    …
    cli('breadcrumb', './build'),
    cli('contexttags', './build'),
    cli('tocCleanMode', '--outputDir', './build'),    // ← здесь
    cli('ganttFixScroll', './build'),
    …
]
```

Одна правка в `docs-build.js`.

### Нет идемпотентности

`injectCleanMode` вставляет `<script>` перед `</body>` **всегда**. При повторном запуске (например, в watch-режиме или после ручной правки build/) — скрипт дублируется. На странице — 2, 3, N копий клиентского скрипта. Каждый выполнится: `hideNavigation` N раз, N `MutationObserver`, N × 5 `setTimeout`. Работает, но неаккуратно.

Фикс — маркер `id="dl-clean-mode"`:

```js
if (content.includes('id="dl-clean-mode"')) return;
content = content.replace('</body>', `<script id="dl-clean-mode">${cleanScript}</script>\n</body>`);
```

### `sessionStorage` — не выход из режима

`isCleanMode = sessionStorage.getItem(…) === 'true'`. Установить `'true'` можно через `?clean=1`. Сбросить — **только** `sessionStorage.clear()` или закрытие вкладки.

Переход на `?clean=0` — `urlParams.has('clean')` → `true` (ключ есть, неважно, какое значение) → `sessionStorage.setItem('diplodoc_clean_mode', 'true')` — **снова активирует**. То есть `?clean=0` — **не** выход, а повторный вход.

Если пользователь хочет «выйти из режима» — единственный способ — `sessionStorage.removeItem('diplodoc_clean_mode')` в DevTools Console, или закрыть вкладку.

Фикс — поддержать `?clean=0` и `?mode=full` как «выключение»:

```js
if (urlParams.get('clean') === '0' || urlParams.get('mode') === 'full') {
    sessionStorage.removeItem('diplodoc_clean_mode');
}
```

### `sessionStorage` может бросить

```js
sessionStorage.setItem('diplodoc_clean_mode', 'true');
```

В `private browsing` (Firefox) или в `iframe` с ограничениями `sandbox` без `allow-same-origin` — `SecurityError`. Не поймано → скрипт падает, `hideNavigation` не вызывается.

Фикс:

```js
try { sessionStorage.setItem(…); } catch { /* fallback: без сохранения */ }
```

### `[class*="sidebar"]` — слишком широкий селектор

```js
document.querySelectorAll('.dc-sidebar, .dc-doc-layout__sidebar, [class*="sidebar"]')
    .forEach(el => (el.style.display = 'none'));
```

`[class*="sidebar"]` находит **любой** элемент с `sidebar` в `class`. Если в статье есть пример кода `<div class="my-sidebar-example">…</div>` — он **тоже** скроется. В clean mode пользователь не увидит свой пример.

Аналогично `[class*="breadcrumb"]` — скроет примеры с `breadcrumb` в class.

Правильно — только Diplodoc-классы (`.dc-sidebar`, `.dc-doc-layout__sidebar`), без `[class*="…"]`.

### `setTimeout × 5` — избыточно

Пять вызовов с интервалами (0, 300, 700, 1200, 2000). Плюс `MutationObserver` — который реагирует на **любое** изменение DOM. То есть после первого DOM-изменения (например, Diplodoc дописывает что-то) `hideNavigation` вызывается ещё раз. Итого — многократные вызовы без ясной необходимости.

Для типичной страницы достаточно: 1 × `hideNavigation()` (сразу) + 1 × `MutationObserver`. `setTimeout` не нужны.

Но — с `setTimeout` защита от «Diplodoc дописывает навигацию через 500 мс после загрузки». `MutationObserver` тоже сработает, но `hideNavigation` может выполниться **до** того, как `MutationObserver` настроен (если DOM-изменение произошло между `hideNavigation()` и `observer.observe(...)` — окно ~5 мс). `setTimeout` перекрывает.

Практически: 5 вызовов + `MutationObserver` — избыточно, но работает. Стоило бы оставить 1–2 `setTimeout`.

### `MutationObserver` без отключения

`observer.observe(document.body, { childList: true, subtree: true })` — подписка на всё DOM. При большом числе изменений (переключение вкладок, анимации) — `hideNavigation` вызывается **на каждую мутацию**. Скрытие навигации — идемпотентно (`style.cssText = …` перезаписывает то же), но лишние вычисления.

Не критично для типичной страницы, но при активном DOM — заметно.

### `console.log` в проде

```js
console.log('[Diplodoc Clean Mode] Activated');
console.log('[Diplodoc Clean Mode] Persistent mode enabled');
```

Видны пользователю в DevTools. Для «чистого» режима, который встраивается в iframe, эти сообщения видны в родительском приложении (если оно открывает DevTools). Лучше убрать или обернуть в `if (window.location.search.includes('debug'))`.

### `hideNavigation` использует `cssText` (перезаписывает всё)

```js
el.style.cssText = `visibility: hidden !important; width: 0 !important; …`;
```

**Перезаписывает** все inline-стили элемента. Если Diplodoc поставил какой-то `style` на `.dc-doc-layout__left` (например, `transition: …` для анимации), он **потеряется**.

Альтернатива — `el.style.setProperty('width', '0', 'important')` для каждого свойства. Или — класс `.clean-mode-hidden`, у которого `!important`-правила в отдельном `<style>`.

Но `cssText` — самый быстрый и не требует отдельного `<style>`. Работает, но агрессивно.

### `urlParams.has('clean')` — не различает `?clean` и `?clean=0`

`urlParams.has('clean')` → `true` для `?clean`, `?clean=`, `?clean=0`, `?clean=1`, `?clean=abc`. То есть `?clean=0` **включает** режим (см. выше). Правильно было бы:

```js
const cleanValue = urlParams.get('clean');
const hasCleanParam = (cleanValue === '' || cleanValue === '1' || cleanValue === 'true') || urlParams.get('mode') === 'embed';
```

Или — `cleanValue !== '0' && cleanValue !== 'false'`.

### `sessionStorage` ключ `diplodoc_clean_mode` — глобальный для домена

Один ключ на всё доменное имя. Если у пользователя на `docs.example.com` открыты две вкладки — обе в clean mode (если одна установила). Или — `localStorage` был бы лучше для «сохранения между визитами», но это не то поведение, что здесь задумано (clean mode — «временный»).

### `injectCleanMode` не проверяет, что `files.length > 0`

`console.log('[tocInject] Процесс завершён.')` — без счётчика. Если `buildDir` пуст (см. баг в `docs-build.js`) — лог `«Процесс завершён»` без индикации «0 файлов обработано».

### `console.log` с префиксом `[tocInject]` — не `[CleanMode]`

```js
console.log(`[tocInject] Процесс завершён.`);
```

Префикс `tocInject`, а не `tocCleanMode` / `[CleanMode]`. Косметика, но при поиске в логах по `CleanMode` — не найдётся.

### `walk` без `fs.existsSync(dir)`

```js
function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(…);
}
```

Если `buildDir` не существует — `fs.readdirSync` бросит `ENOENT`. `injectCleanMode` не ловит. В `docs-build.js` — `clean build` вызывается раньше, но если пользователь запускает `injectCleanMode` вручную на несуществующем каталоге — `throw`.

### `sessionStorage` не изолирует поддомены

Если документация на `docs.example.com`, а приложение на `app.example.com` — `sessionStorage` **изолирован** по origin. Переход между `docs.example.com` и `app.example.com` не сохранит clean mode. Для встраивания через `iframe` это нормально (iframe с `docs.example.com` — свой origin), но если пользователь кликает на внешнюю ссылку в документации и возвращается — clean mode сбросится (потому что возврат — новый origin).

### `tocCleanMode` не документирован в CLI-командах пользователя

`diplodoc-helper.tocCleanMode` — не VS Code-команда, не видна в палитре. Пользователь должен знать, что `?clean=1` — это фича расширения (а не Diplodoc). Ни в `README.md`, ни в `CHANGELOG.md` упоминания `tocCleanMode` / `?clean=1` **нет** (по крайней мере, в той части, которую я видел). При standalone-публикации модуля — это недокументированная фича.

### `injectCleanMode` не читает конфиг

Ни `--clean-params`, ни `--disable`. Всегда инжектит. Если пользователь **не** хочет clean mode — только `--skip=tocCleanMode`.