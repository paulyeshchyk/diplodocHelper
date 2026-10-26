---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `buildDir` не читается из `options.docsRoot`

CLI передаёт `docsRoot`:

```js
generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
```

`runGeneration` читает `options.buildDir`:

```js
const buildDir = typeof options === 'string' ? options : options?.buildDir || './build';
```

`options.docsRoot` игнорируется. Работает только потому, что `docs-build.js` передаёт `./build` (совпадает с default). `--outputDir ./custom` — не сработает.

Фикс — либо CLI передавать `buildDir`, либо `runGeneration` читать `docsRoot`.

### `CURRENT_ENGINE = PLANTUML`, но CLI ставит `MERMAID`

Та же проблема, что в `roadmap.js`. `post-build.js`:

```js
const CURRENT_ENGINE = DiagramEngine.PLANTUML;
```

CLI:

```js
generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
```

**Фактический движок — Mermaid.** `CURRENT_ENGINE` — мёртвая константа (используется только если `options.engine` не задан — программный вызов). В `docs-build.js` — всегда Mermaid.

### `patchPlantUml` — нет идемпотентности

Каждый запуск вставляет `<script>` повторно. При `docs-build.js` в watch-режиме (или повторной сборке) — на странице накапливаются **дубликаты** клиентского скрипта. Первый экземпляр создаёт `svgPanZoom` и ставит `svg.dataset.panZoomInitialized = 'true'`. Второй экземпляр видит `panZoomInitialized` и выходит (`if (svg.dataset.panZoomInitialized) return;`) — не работает.

Но:

- размер HTML растёт (N копий по ~6 KB);
- в `svgPanZoom` возможны конфликты (два инстанса на одном SVG — не поддерживается);
- DOM много.

Фикс — проверять `content.includes('gantt-toggle-btn')` или специальный маркер (`id="dl-gantt-client"`).

### `patchMermaid` — проверка идемпотентности не работает

```js
if (!content.includes('initMermaidGanttLinks')) {
    content = content.replace('</body>', `${injectionBundle}\n</body>`);
    …
}
```

`initMermaidGanttLinks` — не существует. В `mermaid.client.js` функция называется `initMermaidGantt` (без `Links`). Проверка всегда `false` → каждый запуск добавляет новый `<script>`. Та же проблема, что в `patchPlantUml` — дубликаты.

### `patchMermaid` — маркер `mermaid` слишком широкий

```js
if (content.includes('js-gantt-mapping') || content.includes('mermaid')) {
```

`content.includes('mermaid')` ловит **любую** страницу, где встречается слово «mermaid»:

- статья «Про Mermaid» в документации;
- пример кода с ` ```mermaid `;
- ссылка `https://mermaid.js.org`.

Таким страницам инжектится `<script>` с `initMermaidGantt`, который **ничего не находит** (нет `.js-gantt-mapping`). Это лишний `<script>` в HTML, не критично, но «загрязняет» страницы.

Фикс — убрать `|| content.includes('mermaid')`, оставить только `js-gantt-mapping`.

### `plantuml.client.js` — CDN без fallback

`loadScript('https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/…', …)` — если CDN заблокирован / недоступен / offline — скрипт не загрузится, `initPanZoom` не выполнится, pan/zoom **не работает**. Никакого `onerror` на `<script>`, никакого `showWarningMessage`. Пользователь видит статичную диаграмму и не понимает, почему кнопки не действуют.

Фикс — `script.onerror = () => console.warn('svg-pan-zoom failed to load')` или fallback на локальную копию.

### `plantuml.client.js` — кнопки fit-* — мёртвый код

```js
var btnFitWidth = wrapper.querySelector('.js-fit-width');
var btnFitHeight = wrapper.querySelector('.js-fit-height');
var btnFitBoth = wrapper.querySelector('.js-fit-both');
// …
if (btnFitWidth) btnFitWidth.addEventListener('click', fitWidth);
```

`controls.builder.js` создаёт **только** `.js-toggle-pan` и `.js-toggle-zoom`. `.js-fit-*` — не создаются. Ветки `if (btnFitWidth)` — никогда не выполняются. Мёртвый код ~40 строк.

Либо убрать из клиента, либо добавить кнопки в `controls.builder.js` (плюс CSS).

### `plantuml.client.js` — `document.querySelectorAll('.gantt-wrapper')` при загрузке

Если диаграмм несколько (несколько `.gantt-wrapper` на одной странице) — все инициализируются. Но **каждая** загружает `svg-pan-zoom` (одна загрузка, `window.svgPanZoom` уже есть). Ок.

Но если пользователь переключает вкладки (`{% list tabs %}`) и на скрытой вкладке тоже есть `.gantt-wrapper` — `svgPanZoom` инициализируется на `display: none`-элементе. Координаты нулевые, инициализация «успешна», но pan/zoom после показа вкладки может работать некорректно. Обработчик `document.click` на `.yfm-tab` через 100 мс вызывает `instance.resize()` — компенсирует.

### `mermaid.client.js` — свой pan/zoom, без ограничений `svg-pan-zoom`

PlantUML: `svgPanZoom` с `minZoom: 0.05, maxZoom: 15, zoomScaleSensitivity: 0.2`.
Mermaid: `scale = Math.min(scale + 0.1, 5)` / `Math.max(scale - 0.1, 0.2)`.

Разные диапазоны (`0.05–15` vs `0.2–5`), разная чувствительность. UX-несоответствие между двумя диаграммами.

Плюс — Mermaid-pan/zoom через `svg.style.transform = 'translate(...) scale(...)'` (CSS-трансформация). При масштабировании SVG рендерится заново (может быть медленно для больших диаграмм). `svgPanZoom` оперирует `<g>`-группой без перерисовки.

### `mermaid.client.js` — `MutationObserver` не отключается

```js
const observer = new MutationObserver((_, obs) => {
    if (setupMermaidFeatures()) {
        obs.disconnect();
    }
});
observer.observe(parentBlock, { childList: true, subtree: true });
setTimeout(() => observer.disconnect(), 5000);
```

Отключается либо при успехе, либо через 5 секунд. Ок. Но если `setupMermaidFeatures` возвращает `false` каждые 5 секунд (Mermaid не рендерит) — до конца жизни страницы `MutationObserver` не активен (disconnect через 5 с). Пользователь видит статичную диаграмму, pan/zoom не работает.

### `mermaid.client.js` — `window.open(url, '_blank')` — popup blocker

Если браузер блокирует popup, клик по узлу ничего не делает. Обычно `window.open` в обработчике клика — разрешено (user gesture), но при определённых настройках — может блокироваться. Никакого fallback (например, `window.location.href = url` для внутренних ссылок).

### `setupClickableNodes` — `taskId` может не найтись

```js
const selectors = [
    `#${taskId}`,
    `[id*="${taskId}"]`,
    `.task#${taskId}`,
    `[data-id="${taskId}"]`,
];
```

`taskId` — из `mapping` (id задачи, например `budget-planning`). Mermaid генерирует SVG с `id` для каждой задачи, но формат зависит от версии:

- Mermaid ≤ 9.x: `<rect id="budget-planning" …>`;
- Mermaid ≥ 10.x: внутренние id генерируются автоматически (`L-…`), `task.id` не сохраняется как DOM-id.

Если `taskId` не найден ни одним селектором — клик по узлу не работает. Диагностики нет. Пользователь видит `gantt-node-clickable` не на всех узлах.

### `plantuml.patcher.js` — `</body>` в одном регистре

```js
const bodyCloseIndex = content.lastIndexOf('</body>');
```

Ищет **строго** `</body>`. Если HTML-шаблон отдаёт `</BODY>` (например, после minify) — не найдёт, `bodyCloseIndex === -1`, страница пропускается.

Аналогично в `mermaid.patcher.js` (`content.replace('</body>', …)`).

### `findHtmlFiles` в `mermaid.patcher.js` дублирует `walkHtmlFiles` из `plantuml.patcher.js`

Одна и та же логика (рекурсивный обход `.html`), две реализации. Одна с колбэком, другая с массивом. Стоит вынести в `utils/walk`.

### `plantuml.patcher.js` — `getGanttRuntimeFixScrollScript()` читает файл на каждую страницу

```js
function getGanttRuntimeFixScrollScript() {
    const scriptPath = path.resolve(__dirname, 'plantuml.client.js');
    return fs.readFileSync(scriptPath, 'utf-8');
}
```

Вызывается **на каждую страницу** с `gantt-raw-container`. Для 100 страниц — 100 чтений файла. Мелочь, но можно было бы прочитать один раз и кэшировать.

### `mermaid.patcher.js` — `<style>` дублирует `roadmap.css`

В `wrapMermaidContainer` уже встроен `<style>` из `roadmap.css`. Патчер добавляет ещё `<style>` с **частью** правил (`.gantt-wrapper`, `.gantt-toolbar`, `.gantt-toggle-btn`, `.gantt-node-clickable`). Дублирование.

Причины неясны. Если `roadmap.css` надёжно встроен — дублирование избыточно. Если нет (например, генератор другой) — нужно.

### `plantuml.client.js` — `svgPanZoom` instance не сохраняется в переменной на уровне модуля

```js
var panZoomInstance = svgPanZoom(svg, { … });
```

`panZoomInstance` — локальная в замыкании `(function (wrap) { … })(wrapper)`. На `resize` — `window.addEventListener('resize', function () { panZoomInstance.resize(); })` — замыкание срабатывает, работает. Но если пользователь переключит вкладку (и SVG «уйдёт» из DOM) — instance остаётся, `resize()` может выбросить ошибку (элемент отключён). Не критично.

### `svg-pan-zoom@3.6.1` — старая версия (2020)

`3.6.1` — последняя стабильная на 2020. С тех пор библиотека не развивалась. Для базового pan/zoom — достаточно, но:

- нет поддержки `touch`-жестов (мобильные устройства);
- нет доступности (`aria-*`).

Для типичной документации — не критично, но если пользователь открывает с планшета — pan/zoom не работает.

### `roadmap.patcher` и `roadmap` — engine не согласованы

`roadmap` генерирует с `CURRENT_ENGINE = PLANTUML` (по умолчанию) или `options.engine`.

`roadmap.patcher` обрабатывает с `options.engine` (из CLI — `MERMAID`).

Если пользователь **вручную** вызовет `generateRoadMap({ dataPath, engine: PLANTUML })`, а потом `docs-build.js` (который всегда `MERMAID`) — патчер применит Mermaid-патчер к PlantUML-разметке. На странице нет `js-gantt-mapping` (PlantUML её не создаёт), но **есть** `mermaid` — где? В `wrapSvgContainer` нет слова «mermaid», только `<svg>`. Значит `patchMermaid` **не** найдёт маркер. Итог: PlantUML-диаграмма останется **без** клиентского скрипта (ни PlantUML, ни Mermaid).

В стандартной сборке (`roadmap` через `docs-build.js`) это не проявляется, потому что `roadmap` тоже запускается с `MERMAID` (через CLI). Но если пользователь запускает `roadmap` отдельно — легко попасть в рассогласование.

### `error.self` не применимо, `process.exitCode` не ставится

`patchPlantUml` и `patchMermaid` возвращают `void` (ничего). Не сигнализируют об ошибках. Если `findHtmlFiles` упал на нечитаемом каталоге (нет прав) — исключение уйдёт наружу, `runGeneration` не поймает, `process.exitCode` не установится. `docs-build.js` продолжит следующий шаг, как будто всё ок.

### `plantuml.patcher.js` — `console.log('[PlantUML Patcher] Внедрен скриптPan/Zoom…')` — нет пробела

`«скриптPan/Zoom»` — слиплось. Мелочь, но в логах бросается в глаза.

### Опечатка `findHtmlFiles` в `mermaid.patcher.js` — без проверки `fs.existsSync(dir)`

```js
function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    // …
}
```

Проверка есть. Ок.

### `roadmap.patcher` не экспортирует `patchPlantUml` / `patchMermaid`

Только `runGeneration` и `generateGanttFixScroll` (alias). Если пользователю нужно принудительно применить конкретный патчер (например, для отладки) — только через `runGeneration({ engine: … })`.

Мелочь, но можно добавить в `module.exports`.