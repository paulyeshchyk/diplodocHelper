Итог: FM + рефакторинг
======================

Что сделано (капитально)
------------------------

**Утилитарный слой** (Wave 1–4):  
`String_*`, `Url_Transform_*` (4 шт.), `String_Transliterate_Cyrillic`, `Html_Escape_*` (2 шт.), `Html_Classify_File`, `Fs_Walk_Directory`, `Fs_Find_Module_Dirs`, `Link_Classify_External`, `InlineAnnotation_*` (3 шт.), `Path_ToPosix`, `Frontmatter_Split_Raw` — все с типизацией и frozen-snapshot'ами.

**Track A** (`Fs_Walk → 6 коллекторов`): `abbrs`, `terms`, `gosts`, `helptags`, `сontexts`, `figures` — все коллекторы делегируют в `Fs_Walk_Directory`. Асимметрии `skipHidden`/`skipUnderscore`/`skipDirNames`/`skipFullPaths` зафиксированы таблицей в CONTRIBUTING.

**Track B** (`Url_Transform_*`): базовый `String_Transliterate_Cyrillic` + 4 slugify (segment/reference/filename/path-segments). 4 frozen-snapshot'а защищают от переименования файлов/anchor'ов.

**FM + docs-registry** (треки C, Feature-map): 8 модулей `docs-registry/*` → `.ts`:  
`_paths`, `_fields`, `_layout`, `collect-catalog`, `build-page-legend`, `emit-modules-table`, `render-modules`, `feature-map/index`, `feature-map/injector`. IIFE-клиент (`feature-map.client.js`) — оставлен осознанно.

**Ключевые механизмы FM для второго проекта:**

| Механизм                                 | Что                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.json`                            | `modulesFolder` / `modulePrefix` / `moduleSectionTypes` / `skipDirs` / `outFolder` / `strictDimensions` / `includeEmpty` / `emptyLabel` |
| `_fields.yaml`                           | `source: 'frontmatter'                                                                                                                  | 'path' | 'frontmatter-or-path'`, `path.regex + template`, `path.rules[]`, `frontmatterKey` для service-полей |
| `feature-map.config.json`                | `stripDimensions` / `rowDimension` / `columnDimension` / `dimToFieldMap` / `chipLabelField` / `emptyCellSymbol` / i18n                  |
| `data-attrs` (JSON) + `data-dims` (root) | Единственный контракт для браузерного клиента — не завязан на имена измерений                                                           |
| `__empty__`                              | Служебный slug для «модуль без значения измерения», работает в strips и cells                                                           |
| `auto-register`                          | При `strictDimensions: false` неизвестные slug'и попадают в `catalog.dimensions` с warning (не throw)                                   |
| Fallback'и                               | `ident → pureTitle → basename(dir)`, `designation → title`, dimension `dir` опционален                                                  |

**Итог:** `141 suite / 677 passed / 220 todo / 1 skipped`. MES-проект собирается (`122 модуля`), FM строится, back-compat diplodoc-helper сохранён.

* * *

Долги и импрувменты
-------------------

### P1 (важно, но не блокирует PoC)

| #   | Долг                                                                           | Влияние                                                                                                                            | Оценка                                                                           |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **`feature-map.client.js` (IIFE) с inline-копиями `FeatureMap_Filter_Engine`** | Дублирование ~80 строк. При изменении Engine — синхронизация вручную. Работает через `TODO(step-3)`                                | 1-2 дня (esbuild-бандл + перенос тестов `57.3.*` на generic)                     |
| 2   | **`MODULE_TYPELESS_PACKAGE_JSON` warning**                                     | Re-parse каждого `.ts`\-require как ESM. Перф-штраф + шум в `docs-build.js`. 0.5-1 день (CLI-A: прекомпиляция `.ts` → `.js` рядом) |                                                                                  |
| 3   | **`metrics.collector.ts` — нет**                                               | `screens_count` / `transitions_count` / `terms_count` / `standards_count` вручную → дрейф. Для спонсора — пока вручную             | 1-2 дня                                                                          |
| 4   | **`init-config` CLI — нет**                                                    | Пользователь вручную создаёт 4 файла конфигов. Для MES — один раз, но для «второго проекта в общем» — барьер                       | 0.5-1 день (скаффолд `layout` / `_fields` / `dimensions` / `feature-map.config`) |
| 5   | **Дефолтные конфиги в коде**                                                   | `DEFAULT_LAYOUT` / `DEFAULT_FEATURE_MAP_CONFIG` — молчаливое поведение. Пользователь не понимает, «почему FM пустая».              | 0.5 дня (`throw` при отсутствии + `--allow-defaults` для back-compat)            |

### P2 (улучшения, на потом)

| #   | Долг                                                                                                                                                                                                                                                            |                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | **`slugify_latin`** — dead-code (`@deprecated`), 0 потребителей в `src/`. Удалить в следующем мажоре.                                                                                                                                                           |                                                                                                                                                               |
| 7   | **`String_Transliterate_Cyrillic.fromLatinLegacy`** — лоссовый, 0 потребителей, `@deprecated`                                                                                                                                                                   |                                                                                                                                                               |
| 8   | **`test/plugins/utils/encoding.slugify.test.js`** — старая заглушка (`toBeDefined`). Удалить при касании                                                                                                                                                        |                                                                                                                                                               |
| 9   | **`build-page-legend --root-dir`** — deprecated, парсится, но игнорируется. Удалить в мажоре                                                                                                                                                                    |                                                                                                                                                               |
| 10  | **`auto-register` накапливается** — новые slug'и попадают в `catalog.dimensions`, но не в `dimensions.yaml`. Каждый прогон — warning. Импрувмент: собирать в отдельный `catalog.dimensions.autoRegistered` или писать в `dimensions.yaml` с `--update-registry` |                                                                                                                                                               |
| 11  | **Тесты feature-map используют глобальный `DOCS_DIR`**                                                                                                                                                                                                          | `57.1.*` / `57.5.*` читают `_registry/layout.json` реального репо. Работает, но не изолировано. Новые тесты — через `options.docsDir`                         |
| 12  | **`module` в `dimToFieldMap`, но не в strip/row/col MES**                                                                                                                                                                                                       | FM его не отображает. Пользователь решит, добавлять ли в `stripDimensions`                                                                                    |
| 13  | **`content_type` / `status` в 122 статьях MES не заполнены**                                                                                                                                                                                                    | Работа техписа. Скрипт `mes-add-frontmatter.js` заполняет `ident`/`designation`/`audience`, но не `content_type`/`status`/`module` (это семантическое знание) |

### P3 (nice-to-have)

| # | Долг |
| 14 | `feature-map/index.test.ts` — `#17/#18` используют каст `as Record<string, …>` для `__empty__`. При рефакторинге `makeFixture` — поправить типы |
| 15 | `_paths.ts` fallback на `process.cwd()` — для production всегда env; можно убрать fallback с clearer-error (сломает тесты — только при переписывании) | 

* * *

Вывод: PoC готов
----------------

Для MES-проекта:

*   ✅ 4 конфига созданы (layout / \_fields / dimensions / feature-map.config)    
*   ✅ `catalog` собирает 122 модуля, `section`/`audience` извлекаются из пути    
*   ✅ FM строит `audience × section` со strips `content_type × status`    
*   ✅ `__empty__` покрывает «без значения»    
*   ✅ `strictDimensions: false` — новые slug'и не падают    
*   ⚠️ `content_type`/`status`/`module` в статьях пусты — техпис заполнит    
*   ⚠️ `feature-map.client.js` — IIFE, но data-attrs работают