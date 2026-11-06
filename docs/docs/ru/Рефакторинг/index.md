---
title: Рефакторинг
sectionType: Page
pureTitle: Рефакторинг
sectionIndex: ""
---

# План модернизации расширений

Ниже — приоритизированный план на основе текущего состояния проекта
(~601 тест / 137 suite зелёные, feature-map + collect-catalog полностью
на TS, CLI работает из dev и target-project).

## Что уже сделано (для контекста)

| Трек                        | Что                                                                                                | Статус                    |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------- |
| Утилитарный слой (Wave 1–4) | `String_*`, `Url_*`, `Html_*`, `Fs_*`, `Link_*`, `InlineAnnotation_*`, `Frontmatter_*`             | ✅ `.ts`, frozen snapshots |
| Track A                     | `Fs_Walk_Directory` → 6 коллекторов (`abbrs`, `terms`, `gosts`, `helptags`, `сontexts`, `figures`) | ✅                         |
| Track B                     | `Url_Transform_Segment`, `_Reference`, `_Filename`, `String_Transliterate`                         | ✅                         |
| Feature-map                 | FM-pre / FM-a / FM-b / FM-c / FM-d + `data-attrs` (Phase A/B/C)                                    | ✅                         |
| collect-catalog             | `index.js` → `index.ts`, `_paths`, `_fields`                                                       | ✅                         |
| CLI                         | prelude + `--docs-project-root`, `--docs-root`, `--generated-dir`                                  | ✅                         |

## Трек C — закрыть `docs-registry/` (приоритет 1)

Три оставшихся `.js` в папке. Порядок — от меньшего к большему, каждая
волна самостоятельна.

### C-1: `render-modules/index.js` → `.ts`

**Объём:** ~280 строк. **Потребители:** `runRenderModules(argv)` в
`diplodoc-helper-cli.js`.

**Шаги** (по шаблону `CONTRIBUTING §4`):

1. Frozen snapshot на legacy: `index.test.ts` с фикстурным `catalog.json`
   (переиспользовать `makeFixture` из `feature-map/index.test.ts`),
   проверить генерацию `modules.md` для 2-3 slug'ов.
2. Вынести локальные `parseArgv`, `toPosix`, `ensureInclude` — часть в
   `Cli_Parse_Options` (новая общая утилита) и `Path_ToPosix` (уже есть),
   `ensureInclude` — локально, слишком специфичен.
3. `index.js` → `index.ts` + `options: { generatedDir? }`.
4. `runRenderModules` — бросает `Error`, не `process.exit`.

**Риски:** низкие. Разметка таблиц — frozen snapshot.

### C-2: `build-page-legend/index.js` → `.ts`

**Объём:** ~470 строк. **Потребители:** `runBuildPageLegend(argv)`.

Сложнее C-1: содержит логику мержа каталога (`formatDimensionLink`,
`sortEntries`, `renderLegend`, `ensureInclude`).

**Шаги:**

1. Frozen snapshot: фикстура `catalog.json` + `dimensions.yaml` +
   2-3 `index.md` модулей; проверить `page-legend.md` для каждого.
2. `options: { docsDir?, catalog?, generatedDir?, registryDir? }`.
3. `runBuildPageLegend` — бросает `Error`.
4. `TypeDoc`-типизация (`FieldDef` уже есть в `_fields.ts`).

**Риски:** средние. Регулярки парсинга ссылок в `formatLegendValue`
(`[slug](../…)`) — покрыть кейсами до миграции.

### C-3: `emit-modules-table/index.js` → `.ts`

**Объём:** ~270 строк. **Потребители:** `runEmitModulesTable(argv)`.

Зависит от `loadFields`, `String_Compare_Natural`, `Path_ToPosix`. Уже
использует TS-обёртки через shim'ы.

**Шаги:**

1. Frozen snapshot: фикстура `catalog.json` + `fields.yaml`; проверить
   `modules-table.ru.json` — все поля, `id_href`, `treemapLabel`.
2. `index.js` → `index.ts`, `options: { generatedDir?, docsDir? }`.
3. Бросает `Error`.

**Риски:** низкие.

**Итог трека C:** весь `docs-registry/` — `.ts`, кроме
`feature-map/feature-map.client.js` (IIFE, отдельная история FM-d).

## Трек D — CLI-A (приоритет 2)

**Проблема:** warning `MODULE_TYPELESS_PACKAGE_JSON` при каждом
`require('./*.ts')` из `.js` под нативным Node 24 — reparse ESM, перф-штраф
на полном пайплайне (`docs-build.js` делает десятки CLI-вызовов).

**Решение:** прекомпиляция `src/plugins/**/*.ts` → `.js` рядом с `.ts`:

- `tsc --outDir src/plugins --noEmit false` — но это переопределит
  `dist/extension.js`; лучше `esbuild` per-file или `tsc` в отдельную
  `src/plugins/**/*.js` (с добавлением в `.gitignore`);
- `build.js` (esbuild extension) уже собирает `dist/extension.js` — не
  трогаем;
- `npm run build:prod` — добавить шаг `npm run build:plugins` до
  `generate-manifest`;
- в `package.json` `scripts.prepare` — `precompile` уже гоняет `validate`,
  плюс `build:plugins`.

**Альтернатива:** Node 24 + `--experimental-transform-types` в
`docs-build.js` (флаг `spawnSync`). Дешевле, но хрупко (зависит от версии
Node у пользователя).

**Мой выбор:** CLI-A (esbuild per-file). Закрывает warning, не меняет
`installScripts` (`src/plugins/**/*.js` попадут в target-project, а
`.ts` рядом — лишний балласт в `files`, но 5–10 KB на пакет).

## Трек E — `commands/*` split (приоритет 3)

**Проблема:** 30+ `.js` в `src/commands/`, все смешивают:
- бизнес-логику (`ux_section_create` и т.п.);
- vscode-API (`vscode.window.showInputBox`, `vscode.workspace.workspaceFolders`).

Тестирование через `jest.mock('vscode', ...)` хрупкое, много
`require('vscode')` внутри `it` не работает (см. фикс `Url_Transform_Reference#18`).

**Подход:** разделить на два слоя.

```
src/commands/
  sections/
    Section_Create_Orchestrant.ts     ← бизнес-логика, чистая
    Section_Create_Orchestrant.test.ts
  adapters/
    vscode.commands.section.Create.ts ← тонкий адаптер: собирает args
                                         из vscode API → вызывает orchestrant
```

**План по командам** (приоритет по частоте использования и объёму):

1. `section.Create`, `section.Delete`, `section.Move`, `section.Rename`
   — ядро работы с секциями; уже есть `sections.core` (`utils/yaml.*`,
   `utils/md.index.*`, `utils/diplodoc.flow`). Orchestrant'ы получат
   типизированный вход/выход, станут тестируемы без vscode.
2. `link.Copy`, `link.Paste`, `link.AddAnchor`
   — `Link_Classify_External`, `Url_Transform_*` уже TS; оркестранты
   тонкие.
3. `file.Delete`, `smart.delete`, `image.PasteFromList`,
   `image.PasteFromClipboard`
   — файловые операции, выиграют от `Fs_*`.
4. `abbr.Add`, `term.Add`, `gost.Add`, `gost.Insert`
   — уже частично покрыты `InlineAnnotation_*`, `abbrs.*`/`terms.*`/`gosts.*`.
5. `linter.links`, `linter.abbrs`, `linter.terms`
   — `linter.links` уже `plugins/linter/linter.links.js`, отдельно;
6. `context.Update`, `context.Delete`, `helptag.Update`, `helptag.Delete`
   — простые, можно последними.
7. `settings`, `installScripts`, `footnote.add`, `reindex.*` — по
   остаточному принципу.

**Не в scope трека E:** сами vscode-команды (`vscode.window.showQuickPick`
и т.д.) остаются в адаптерах — их тесты через `__mocks__/vscode.js`
(уже есть) остаются как smoke.

**Итог:** `src/commands/*.js` → `src/commands/sections/*.ts` +
`src/commands/adapters/*.js` (постепенно). Возможность тестировать
логику без vscode-mock'ов = ключевой выигрыш.

## Трек F — `plugins/*` миграция (приоритет 4)

По одной фиче. Порядок — по готовности зависимостей (все `utils/`
уже TS).

| Плагин                                    | Сложность | Почему сейчас                                                                                                                    |
| ----------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `linter/linter.links.js`                  | низкая    | использует `parseMarkdownLinks`, `String_Compare_Natural`                                                                        |
| `reindexer/*`                             | средняя   | `reindexer.directories`, `figures`, `footnotes`, `md` — 4 файла, связаны с `sections.core`                                       |
| `figures/figures.js`, `figures.writer.js` | низкая    | `Html_Escape_Text`, `url/`                                                                                                       |
| `breadcrumb/*`                            | низкая    | коллектор+инжектор, есть TS-обёртки (`Fs_Walk`, `Html_Classify_File`)                                                            |
| `contexts/*`                              | средняя   | `сontexts.collector` (уже TS через `Fs_Walk`), `contexts.writer`, `context-search.client.js` (IIFE, как `feature-map.client.js`) |
| `helptags/*`                              | низкая    | коллектор уже TS, `helptags.writer` — 30 строк                                                                                   |
| `helpMap/*`                               | низкая    | `helpmap.js` + `extractor` + `writer`                                                                                            |
| `contentNavigator/*`                      | высокая   | 15+ файлов, browser-скрипты (`core-renderer.js`), специализированная сборка                                                      |
| `comments/*`                              | высокая   | server + client + admin; отдельный трек (см. H)                                                                                  |

**Принцип:** один плагин — один коммит, frozen snapshot до миграции,
`*.types.ts` если возвращает `{}` / `[]`.

## Трек G — `extension.js`, `ContextMenuManager.js`, `nls_*` (приоритет 5)

**`extension.js`** — точка входа активации. Содержит:
- регистрация команд (`commandHandlers`);
- регистрация `CodeActionProvider`-ов;
- highlighter'ы (`AbbrHighlighter`, `TermHighlighter`);
- `ContextManager` (polling).

**Миграция:**
1. `ContextMenuManager.js` → `ContextMenuManager.ts` (типизировать
   `disposables`, `contextUpdaters`, `PollingContextMenuManager`). Тесты
   уже есть (2 suite, #01..#03), но `toBeDefined` — переписать на
   поведение через `__mocks__/vscode.js`.
2. `nls_loader.js`, `nls_ts.js` — маленькие, мигрировать с
   `String_Translate_*` если появятся тесты.
3. `extension.js` → `extension.ts` — только после `commands/*`
   мигрированы (иначе `require('./commands/*.js')` из `.ts`).

## Трек H — server (опционально, отдельный)

`src/server/` (`comments.server`, `admin`) — независимый от extension
проект. Свой жизненный цикл, своя БД (SQLite), свой фронтенд (admin panel).
Мигрировать после G, или оставить `.js` — не критично для VSIX-сборки
(не попадает в `dist/extension.js`).

## Трек I — `feature-map.client.js` (опционально, FM-d)

IIFE, сейчас работает через `data-attrs` без бандлера. **Не блокирует**
второй проект. Переход на `client.ts + esbuild` — если:
- нужен `import` (например, общий `FeatureMap_Filter_Engine` — не
  дублировать inline-копии);
- нужны TS-типы в клиенте (сейчас `// @ts-nocheck`).

**Опционально**, после трека D (CLI-A) — механика та же (esbuild per-file).

## Приоритет и последовательность

```
C (docs-registry)      → 2-3 дня
  C-1 render-modules
  C-2 build-page-legend
  C-3 emit-modules-table

D (CLI-A)              → 0.5-1 день
  esbuild per-file для src/plugins/**/*.ts → .js
  закрывает MODULE_TYPELESS_PACKAGE_JSON
  упрощает все последующие треки (не думать про .ts-require)

E (commands split)     → 3-5 дней, волнами по 1-2 команды
  сначала: section.*  (ядро)
  потом: link.* / file.* / abbr.* / term.*

F (plugins)            → 5-7 дней, плагин за плагином
  linter / figures / breadcrumb / helptags / helpMap — быстро
  reindexer / contexts — среднее
  contentNavigator — долго, отдельная волна

G (extension.js)       → 1-2 дня
  ContextMenuManager → nls → extension

H (server)             → опционально, 2-3 дня

I (feature-map.client) → опционально, 1-2 дня
```

**Суммарно:** ~3–4 недели на полную миграцию (без H и I — ~2.5 недели).

## Принципы (из `CONTRIBUTING.md`)

Каждая волна:

1. **Frozen snapshot на legacy** — фиксируем эталон.
2. **Типы** — `*.types.ts` + JSDoc в legacy.
3. **Миграция** — `.js` → `.ts`, shim-обёртка.
4. **Прогон** — `npm test`, `npm run type-check`.
5. **Удаление shim** — отдельный коммит.

**Не смешивать** волны. **Не удалять** legacy до зелёного snapshot после
миграции всех потребителей.
