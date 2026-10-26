---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---

## Известные ограничения

### `CURRENT_ENGINE = PLANTUML`, но CLI ставит `MERMAID`

`roadmap.js`:

```js
const CURRENT_ENGINE = DiagramEngine.PLANTUML;
```

`diplodoc-helper-cli.js`:

```js
generateRoadMap({
    docsRoot: docsDir,
    dataPath,
    dataRaw,
    engine: DiagramEngine.MERMAID,
});
```

**Жёстко Mermaid.** Вызов `runGeneration` **без** `engine` (например, программно, если кто-то импортирует модуль) — PlantUML. Вызов через CLI — Mermaid. Если пользователь запускает `docs-build.js`, в котором `cli('roadMap', …)` → Mermaid.

То есть **фактический движок в проде — Mermaid**, а не PlantUML. `CURRENT_ENGINE` — мёртвая константа. Расхождение создаёт путаницу при отладке.

### PlantUML требует `java` — не везде есть

`checkEnvironment`:

- если `PLANTUML_JAR_PATH` в env — OK;
- `execSync('java -version')` — OK;
- `execSync('plantuml -version')` — OK;
- иначе — `console.error` и **возврат строки-заглушки** `«*Ошибка сборки диаграммы…*»` (вместо генерации).

Если пользователь без `java`, но с Mermaid-движком (по CLI) — PlantUML **не вызывается**, всё работает. Если пользователь переключил `CURRENT_ENGINE = PLANTUML` в коде — упадёт без `java`. Диагностика в `console.error`, не в UI. Пользователь увидит «Ошибка сборки диаграммы» в готовой странице.

### `plantuml.jar` ищется в трёх местах

```js
function getPlantUmlCommand(tempPumlPath, targetDir) {
    if (process.env.PLANTUML_JAR_PATH && fs.existsSync(process.env.PLANTUML_JAR_PATH)) {
        return `java -jar "${process.env.PLANTUML_JAR_PATH}" …`;
    }
    const projectRelativeJar = path.resolve(__dirname, '../../../docs/_assets/jar/plantuml.jar');
    if (fs.existsSync(projectRelativeJar)) {
        return `java -jar "${projectRelativeJar}" …`;
    }
    return `plantuml …`;
}
```

Приоритет:

1. `PLANTUML_JAR_PATH` в env.
2. `<project>/docs/_assets/jar/plantuml.jar`.
3. Команда `plantuml` в PATH.

`path.resolve(__dirname, '../../../docs/…')` — от `src/plugins/roadMap/builders/plantuml.svg.builder.js` **три** уровня вверх → `src/plugins/roadMap/../..` → `src/plugins`… стоп, это неверно. Три уровня от `src/plugins/roadMap/builders/`:

- `..` → `src/plugins/roadMap/`
- `../..` → `src/plugins/`
- `../../..` → `src/`

Значит `path.resolve(__dirname, '../../../docs/_assets/jar/plantuml.jar')` = `src/docs/_assets/jar/plantuml.jar`. Это **не** `<project>/docs/`, это `src/docs/`. Скорее всего, баг — должно быть `'../../../../docs/_assets/jar/plantuml.jar'` (4 уровня вверх).

Практически: jar в `src/docs/` почти никто не кладёт, так что работает fallback на `plantuml` в PATH. Но если пользователь положит jar в `<project>/docs/_assets/jar/` — модуль его **не найдёт**.

### `--dataRaw` парсится, но не используется как fallback в CLI-строке

```js
} else if (command === 'roadMap') {
    const docsDir = …;
    const dataPath = dataPathIndex !== -1 ? args[dataPathIndex + 1] : undefined;
    const dataRaw = dataRawIndex !== -1 ? args[dataRawIndex + 1] : undefined;

    generateRoadMap({ docsRoot: docsDir, dataPath, dataRaw, engine: MERMAID });
}
```

`dataRaw` передаётся в `runGeneration`, но `runGeneration` **читает** `options.data`, не `options.dataRaw`:

```js
const dataSource = typeof options === 'object' ? options.data : null;
```

То есть `--dataRaw` теряется. Если пользователь передал `--dataRaw '[…]'` без `--dataPath` — `runGeneration` получит `data = undefined`, `resolveData(undefined)` → fallback на `DEFAULT_DATA_PATH`. То есть `--dataRaw` **не работает**.

### `cleanupRoadmapPages` — тихая очистка при ошибке

```js
if (!data) {
    cleanupRoadmapPages(docsRoot);
    return;
}
```

Если данные невалидны (JSON-парсинг бросил), `runGeneration` вызывает `cleanupRoadmapPages` — перезаписывает `roadmap/index.md` на «*Данные временно недоступны.*». Пользователь запустил сборку, ожидал увидеть диаграмму, видит заглушку. `console.error` в логах, но если запуск через `docs-build.js` — лог может потеряться среди шагов.

### `task.url` — не `task.href` и не `task.link`

В `roadmap-data.json` поле URL называется `url`. В `prepareRoadmapData`:

```js
if (task.url) mapping[task.id] = task.url;
```

В `generateTableCompact` URL **не** используется — таблица показывает только `name`, `start`, `end`, `deps`. То есть если в данных `url` есть, он попадает только в `mapping` (для диаграммы), а в таблице — обычный текст, не ссылка.

См. `table.generator.js`:

```js
const funcLabel = func.url ? `[${func.name}](func.url)` : `${func.name}`;
```

Стоп — `url` в `mapping` для диаграммы, но в таблице — **литерал** `(func.url)` (не подставляется). Баг:

- `[${func.name}](func.url)` — в markdown это ссылка `[текст](func.url)`, где `func.url` — буквальная строка `func.url`, а не значение поля. Ссылка ведёт на `func.url` — несуществующий путь.
- Аналогично для `module`: `const moduleLabel = module.url ? \`[${module.name}](module.url)\` : …`.

То есть если у модуля или функции есть `url`, в таблице ссылка **сломана** (ведёт на `module.url` / `func.url`). Если нет — просто текст.

### `prepareRoadmapData` и `generateTableCompact` дублируют группировку

Обе функции строят `groups` + `modules` независимо:

- `prepareRoadmapData` — для диаграммы (с `mapping`);
- `generateTableCompact` — для таблицы (с `&nbsp;`-отступами).

Две реализации одной логики. Если в `prepareRoadmapData` добавят обработку «сирот» (например, `task.dependencies` без `module`), в `generateTableCompact` этого не будет.

### `start`/`end` — только `MM-YYYY`

`parseDateToNumber(dateStr)`:

```js
const parts = dateStr.split('-');
if (parts.length !== 2) return 0;
const month = parts[0].padStart(2, '0');
const year = parts[1];
return parseInt(`${year}${month}`, 10);
```

Ожидает `MM-YYYY` (например, `01-2024`). Если пользователь напишет `2024-01` (ISO-формат) — `parts[0]` = `2024`, `parts[1]` = `01` — `month = '2024'`, `year = '01'` — `parseInt('012024')` = `12024`. Некорректная сортировка.

`generateMermaidScript` использует `dateFormat MM-YYYY` — тоже ожидает этот формат. `plantuml.script.builder` — `[startMonth, startYear] = task.start.split('-')` — тоже ожидает `MM-YYYY`.

Формат **жёстко** `MM-YYYY`. Если пользователь ошибётся — диаграмма отрендерится с неверными датами (например, `2024` как месяц → PlantUML/Mermaid не смогут распарсить и покажут ошибку в диаграмме).

### `plantuml.svg.builder` использует `exec` с конкатенацией

```js
const command = getPlantUmlCommand(tempPumlPath, targetDir);
exec(command, callback);
```

`exec` использует shell. `tempPumlPath` и `targetDir` подставляются в строку. Если путь содержит пробелы (`C:\Program Files\…`) — `exec` разобьёт на аргументы. В коде пути обёрнуты в `"…"`, но если в пути есть `"` или `;` — инъекция. Практически: `exec` для jar-пути приемлем (пути контролирует пользователь), но **не** безопасно для авто-генерируемых путей.

### `outputDir` в `buildPlantUml` — это `outputDir` из `runGeneration`

```js
const outputDir = path.join(langDir, 'roadmap');
```

`buildPlantUml(data, lang, outputDir, ROADMAP_CSS)`:

```js
const { svgAbsolutePath } = getPlantUmlImagePath(outputDir, lang);
// outputDir/images/gantt_<lang>.svg
```

То есть SVG сохраняется в `docs/<lang>/roadmap/images/`. При сборке `@diplodoc/cli` эта папка попадёт в `build/<lang>/roadmap/images/`. Ссылка из markdown на SVG — **абсолютный** путь через `README`? Проверить:

- `wrapSvgContainer` вставляет `svgContent` **inline** (не `![](…)`), SVG-контент целиком внутри HTML;

Значит `buildPlantUml` возвращает **inline SVG**. А `svgAbsolutePath` — куда записывается файл — **не** используется в markdown (только как промежуточный). Это может быть проблемой: если пользователь откроет `build/<lang>/roadmap/index.html` — SVG уже inline, всё ок. Но сам SVG-файл в `roadmap/images/` «висит» (не referenced). Это не баг (просто лишний файл), но при `cleanupRoadmapPages` его удаляют.

### `cleanupRoadmapPages` — удаляет `gantt_<lang>.svg`, но не `gantt_<lang>.puml`

Если `renderPlantUmlToSvg` упадёт **до** удаления `.puml` (например, `error` в `exec`), то `.puml` останется в `roadmap/images/`. `cleanupRoadmapPages` его не трогает (только `.svg`). Мусор накапливается.

### `roadmap.patcher` — не часть `roadmap`

`patcher` (см. следующую статью `4.2-033`) вызывается отдельным шагом `ganttFixScroll` в `post`-фазе. `roadmap` **не** знает о `patcher` и не проверяет, что он отработал. Если `--skip=ganttFixScroll` — диаграмма рендерится, но не интерактивна.

### `lang: 'ru' | 'en'` захардкожено

```js
const languages = fs.readdirSync(docsRoot).filter(dir => {
    return fs.statSync(fullPath).isDirectory() && (dir === 'ru' || dir === 'en');
});
```

Только `ru` и `en`. Если пользователь добавил `de` — `roadmap` для `de` не генерируется. Пользователь увидит `/de/roadmap/` — 404.

### `svg` читается целиком в память

```js
let svgContent = fs.readFileSync(renderPath, 'utf-8');
```

PlantUML-Gantt для большого проекта (50+ задач) — мегабайты. `fs.readFileSync` + `wrapSvgContainer` + `fs.writeFileSync` — всё в памяти. Для типичного проекта — ок, для крупного — потенциально медленно.

### `buildMermaidSvg` — заглушка

```js
async function buildMermaidSvg() {
    return { svgContent: null, isClientRendered: true };
}
```

Функция **не используется** нигде. При `MERMAID`-движке `buildMermaid` не вызывает `buildMermaidSvg` — она возвращает `wrapMermaidContainer(script, …)` с markdown-блоком ` ```mermaid `, а `@diplodoc/cli` (клиентский Mermaid) отрендерит его в браузере. `buildMermaidSvg` — мёртвый код (или задел на будущее — серверный рендер Mermaid через `mermaid-cli`).

### `mappingJson` в Mermaid-ветке содержит пустую строку при отсутствии mapping

```js
const mappingJson = Object.keys(mapping).length > 0 ? JSON.stringify(mapping) : null;
```

Если `mapping` пуст (у пользователя нет `url` в данных) — `mappingJson = null`, в `wrapMermaidContainer` `mappingBlock = ''` (пустая строка). `patcher` (для Mermaid) проверит `if (!rawMapping) return;` — клики по узлам не работают. Ожидаемое поведение, но не документировано.

### `console.log('[${lang}] Roadmap создан (${engine}): ${indexPath}')`

Выводит `engine` — но фактический движок может отличаться от `CURRENT_ENGINE`, если вызов был через CLI с `MERMAID`. В логе — `engine` из `options` (или `CURRENT_ENGINE`). Совпадает с реальным, но константа `CURRENT_ENGINE` создаёт путаницу.

### `roadmap` не создаёт `toc.yaml` для папки `roadmap/`

`runGeneration` пишет только `index.md`. `toc.yaml` и `index.yaml` — **не** пишутся. Пользователь должен сам добавить запись в `toc.yaml` родителя (например, `Дополнительнаяинформация/toc.yaml`) — иначе в навигации `roadmap/` не появится.

Сравни с `abbrs`/`terms`/`gosts`/`figures`/`helptags`/`contexts` — все пишут `toc.yaml` + `index.yaml` + `index.md`. `roadmap` — только `index.md`. Несогласованность.

Практический эффект: пользователь запустил `docs-build.js`, ожидал, что раздел «Планы» появится в навигации — не появился. Надо вручную добавлять.

### `roadmap` не идемпотентен по `mapping`

`mapping` (id → url) собирается **только** из `tasks` (функции). У групп и модулей `url` **не** попадает в `mapping`. То есть клик по milestone (группа) в PlantUML — не работает. Клик по задаче (функция) — работает.

В `generateMermaidScript` — то же: `mapping[milestoneId] = groupObj.url` (для групп) — **есть**! Расхождение между PlantUML- и Mermaid-ветками:

- **PlantUML**: `[${milestoneLabel}] links to [[${groupObj.url} ${milestoneLabel}]]` — ссылка встроена в `[[…]]`-синтаксис;
- **Mermaid**: `mapping[milestoneId] = groupObj.url` — ссылка в `mapping`-JSON, а `patcher` навешивает клик.

Оба работают, но **по-разному**. В PlantUML — родная ссылка (`links to`), в Mermaid — патчер.

### `generateMermaidScript` — `deps` фильтр

```js
const deps = task.dependencies.filter(id => {
    const depItem = data.find(d => d.id === id);
    return depItem && depItem.type === 'function';
});
let afterPart = deps.length > 0 ? `, after ${deps.join(' ')}` : '';
```

`dependencies` задачи (`function`) содержит `[moduleId, ...functionDeps]`. Фильтр оставляет только `functionDeps` (не `moduleId`). Правильно: `after` в Mermaid — только для межфункциональных зависимостей, а не для «принадлежит модулю».

Но если `functionDeps` ссылается на `task.id`, который **не** в `tasks` (например, удалён), Mermaid упадёт с «unknown task». Диагностики нет.

### `data.find(d => d.id === id)` — O(n) на каждую зависимость

В `generateMermaidScript`:

```js
const depItem = data.find(d => d.id === id);
```

В цикле по `taskList.forEach`. Для 50 задач × 5 зависимостей = 250 × `find` по `data` (1000 записей) = 250 000 операций. Работает, но можно было бы построить `dataById`-карту один раз.

### `lang` в `roadmap-data.json` не учитывается

Один и тот же `roadmap-data.json` используется для `ru` и `en`. `title`, `name`, `start`, `end` — **одни и те же**. Нет поля `name_ru`/`name_en` или `locale`.

Практический эффект: `en`-дорожная карта содержит русские названия. Для расширения, заточенного под русскоязычную документацию, — нормально. Но если пользователь добавит `en`, придётся делать **два** `roadmap-data.json` и передавать разные `--dataPath` — что не поддерживается CLI (один `--dataPath`).

### `roadmap` не в `module.exports` файла CLI

```js
module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    generateTocCleanMode,
    fixFootnoteAnchors,
    reindexFigures,
    generateFigures,
    generateAbbrs,
    generateTerms,
    generateGosts,
};
```

`generateRoadMap` **отсутствует** в `module.exports`. Как и `helptags` — CLI-команда работает, но программно импортировать нельзя. Для внешних интеграций — неудобно.

### PlantUML-диаграмма **не** регенерируется при повторной сборке без данных

Если пользователь запускает `docs-build.js` второй раз, `roadmap` пытается перегенерировать SVG. `renderPlantUmlToSvg` **не** проверяет `fs.existsSync(dataPath)` — перезаписывает всегда. Для `plantuml` это нормально. Но `svgAbsolutePath` может существовать «старым» (от предыдущей сборки) — если `exec` упадёт, пользователь увидит старую диаграмму (или ошибку в ней).

`cleanupRoadmapPages` вызывается **только** если `data = null`. Если данные есть, но `exec` упал — `renderPlantUmlToSvg` бросит, `buildPlantUml` вернёт строку-заглушку `«*Ошибка сборки диаграммы…*»`, `runGeneration` запишет её в `index.md`. `cleanupRoadmapPages` **не** вызывается (данные были).

То есть при ошибке рендера пользователь видит в статье строку-заглушку вместо диаграммы, но `roadmap/index.md` перезаписан. При следующей сборке — попробует снова.