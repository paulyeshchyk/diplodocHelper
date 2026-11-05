# Feature Map: руководство для нового проекта

Документ для команды, которая хочет подключить интерактивную матрицу
модулей (feature-map) к своему руководству. Покрывает:

- что такое feature-map и зачем;
- формат frontmatter, который нужно писать в статьях;
- формат `catalog.json`, который читает генератор;
- конфиг `feature-map.config.json`;
- пошаговый пример «буклеты телефонов»;
- CLI-шпаргалку;
- ограничения и troubleshooting;
- что нужно доработать для полной автоматизации.

---

## 1. Что такое feature-map

Матрица вида **«строки × колонки»**, в ячейках — карточки статей. По
осям — два измерения из конфига (например, «линейка продукта» ×
«категория»). Над матрицей — полосы фильтров по другим измерениям
(например, «производитель», «аудитория»).

Клик по фильтру сужает выборку: карточки не из выбранного значения
подсвечиваются серым. При наведении — превью: какие карточки исчезнут
при клике (пунктирная обводка), какие останутся (сплошная заливка).

Клик по карточке открывает статью по якорю, заданному в конфиге.

**Зачем:** для больших руководств — навигация по «карте» всего
документа вместо дерева в левом меню. Работает как «оглавление
по измерениям».

---

## 2. Модель данных

### 2.1. Frontmatter в статьях

Каждая статья (модуль / буклет / продукт) — папка с `index.md`.
Frontmatter содержит **измерения**, по которым статья будет
отфильтровываться:

```yaml
---
title: iPhone 15 Pro

# Измерения — списки слагов (ссылки на пункты в dimensions)
manufacturer: apple
category: flagship
form_factor: slab
audience:
  - consumer
  - business

# Опциональные поля для отображения
ident: iPhone 15 Pro                 # что показать на карточке
designation: Флагман Apple 2023 года # tooltip карточки
---
```

**Правила:**

- имя поля (напр. `manufacturer`) → имя измерения (должно совпадать
  с ключом в `dimensions` в `catalog.json`);
- значение — слаг из `dimensions.<name>.items` (напр. `apple`);
- для multi-измерений (одна статья в нескольких категориях) — YAML-список;
- `ident` — то, что попадёт в текст карточки (по умолчанию в текущей
  конфигурации `chipHtml` использует `ident`);
- `designation` — `title="…"` карточки (нативный browser tooltip).

### 2.2. Формат `catalog.json`

Это «снимок» всех статей и измерений, который читает генератор.
Генерируется из frontmatter (см. §4.4) или пишется вручную (для
первого эксперимента — быстрее).

Структура:

```json
{
  "docsRoot": "/abs/path/to/booklets",
  "modules": {
    "iPhone15Pro": {
      "dir": "iPhone15Pro",
      "id": "1",
      "ident": "iPhone 15 Pro",
      "manufacturers": ["apple"],
      "categories": ["flagship"],
      "form_factors": ["slab"],
      "audiences": ["consumer", "business"]
    }
  },
  "dimensions": {
    "manufacturer": {
      "items": {
        "apple": { "dir": "Manufacturers/Apple", "title": "Apple" }
      }
    },
    "category": {
      "items": {
        "flagship": { "dir": "Categories/Flagship", "title": "Флагман" }
      }
    }
  },
  "index": {
    "manufacturer": { "apple": ["iPhone15Pro", "iPhone15"] },
    "category":     { "flagship": ["iPhone15Pro"] }
  }
}
```

**Ключевые части:**

| Поле         | Назначение                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docsRoot`   | Абсолютный путь к папке со статьями. От него считается префикс URL.                                                                       |
| `modules`    | `{ dir → { ..., measurements as arrays } }`. Поля-измерения — **arrays**, даже если значение одно.                                        |
| `dimensions` | `{ dimName → { items: { slug → { dir, title } } } }`. `dir` — **относительно `docsRoot`** (папка, где лежит `index.md` пункта измерения). |
| `index`      | `{ dimName → { slug → [moduleDir, ...] } }`. Инвертированный индекс: какие модули у какого значения измерения.                            |

**Инварианты:**

- `dimensions.<dim>.items.<slug>.dir` — путь **внутри** `docsRoot`.
  Иначе `href` на карточке измерения будет `/../...` (битый).
- `index.<dim>.<slug> = []` (пустой массив) — значение будет
  отфильтровано (`pickUsable`). Полезно, если значение объявлено,
  но статей пока нет.
- `modules.<dir>.<field>` — поле, совпадающее с `dimToFieldMap[<dim>]`
  в конфиге. Для `actor` дефолт — `actors`; для `manufacturer` —
  `manufacturers` (если так указано в конфиге).

### 2.3. `dimensions` — где хранится справочник

В текущем репозитории справочник лежит в `docs/_registry/dimensions.yaml`
(используется `collect-catalog`). Для нового проекта — свой файл или
inline в `catalog.json`. Формат YAML:

```yaml
dimensions:
  manufacturer:
    title: Производитель
    items:
      apple:   { dir: "Manufacturers/Apple",   title: "Apple" }
      samsung: { dir: "Manufacturers/Samsung", title: "Samsung" }
      xiaomi:  { dir: "Manufacturers/Xiaomi",  title: "Xiaomi" }

  category:
    title: Категория
    items:
      flagship: { dir: "Categories/Flagship", title: "Флагман" }
      midrange: { dir: "Categories/Midrange", title: "Средний сегмент" }
      budget:   { dir: "Categories/Budget",   title: "Бюджетный" }
```

---

## 3. Конфиг feature-map

Полный интерфейс `FeatureMapConfig` (см. `feature-map.types.ts`):

```typescript
interface FeatureMapConfig {
    outputPathTemplate: string;         // {lang}/Booklets/FM/map.md
    moduleHrefAnchor: string;           // 'specifications'
    moduleHrefTemplate: string;         // '/{docsRootRel}/{dir}/index.html#{anchor}'
    stripDimensions: ReadonlyArray<string>;  // ['manufacturer', 'category']
    stripLabels: Readonly<Record<string, string>>;  // { manufacturer: 'Производитель' }
    rowDimension: string;               // 'form_factor'
    columnDimension: string;            // 'category'
    dimToFieldMap: Readonly<Record<string, string>>;  // { category: 'categories' }
    title: string;                      // 'Карта буклетов'
    sectionType: string;                // 'Page'
    counterPlaceholder: string;         // 'Показано: —'
    resetButtonText: string;            // 'Сбросить все'
    emptyCellSymbol: string;            // '·'
}
```

**Ключевые решения:**

- **`rowDimension` / `columnDimension`** — определяют сетку. Ячейка
  `(columnValue, rowValue)` заполняется модулями, у которых есть оба
  значения. Модуль может быть в нескольких ячейках (если у него
  несколько значений по строке или колонке).
- **`stripDimensions`** — полосы фильтров над сеткой. Порядок strips =
  порядок в массиве. Обычно совпадают с row/column, но не обязаны
  (можно добавить третье/четвёртое измерение как «внешний фильтр»).
- **`dimToFieldMap`** — соответствие «имя измерения в dimensions → имя
  поля в module». Пример: измерение `category`, поле в модуле —
  `categories` (потому что array). Без этого поля сетка не построится
  (throw в `runEmitFeatureMap`).
- **`moduleHrefAnchor`** — якорь на странице модуля. Обычно это
  `naznachenie`, `specifications` или любой id внутри статьи.
- **`outputPathTemplate`** — куда положить `feature-map.md`. Поддерживает
  `{lang}`. Относительный путь от `DOCS_DIR`.

**Merge при `--config`:** shallow на верхнем уровне. Чтобы изменить
`stripLabels`, нужно указать **весь** объект. Неизвестные ключи
игнорируются с `console.warn`.

**Дефолтный конфиг** — `DEFAULT_FEATURE_MAP_CONFIG` в
`feature-map.constants.ts`. Соответствует текущей иерархии `Модули/`
и измерениям `actor`/`capability`/`layer`/`family`. Второй проект
обязан переопределить **все** поля, завязанные на измерения.

---

## 4. Пошаговый пример: буклеты телефонов

Сценарий: у нас есть база буклетов, каждый описывает модель телефона.
Нужна матрица «линейка × категория» с фильтрами по производителю.

### 4.1. Структура проекта

```
docs/
└── en/
    ├── booklets/                              ← docsRoot
    │   ├── iPhone15Pro/
    │   │   └── index.md
    │   ├── iPhone15/
    │   │   └── index.md
    │   ├── GalaxyS24/
    │   │   └── index.md
    │   ├── RedmiNote13/
    │   │   └── index.md
    │   │
    │   ├── Manufacturers/                     ← dimension tree
    │   │   ├── Apple/
    │   │   │   └── index.md
    │   │   ├── Samsung/
    │   │   │   └── index.md
    │   │   └── Xiaomi/
    │   │       └── index.md
    │   │
    │   ├── Categories/
    │   │   ├── Flagship/
    │   │   │   └── index.md
    │   │   ├── Midrange/
    │   │   │   └── index.md
    │   │   └── Budget/
    │   │       └── index.md
    │   │
    │   └── FormFactors/
    │       ├── Slab/
    │       │   └── index.md
    │       ├── Foldable/
    │       │   └── index.md
    │       └── Flip/
    │           └── index.md
    │
    └── _generated/                            ← сюда положим catalog.json и feature-map.config.json
        ├── catalog.en.json
        └── feature-map.config.json
```

Каждая `Manufacturers/Apple/index.md`, `Categories/Flagship/index.md`,
`FormFactors/Slab/index.md` — обычная статья. Её заголовок
отображается на кнопке фильтра/заголовке. Её `dir` (относительно
`docsRoot`) записывается в `dimensions.<dim>.items.<slug>.dir`.

### 4.2. Frontmatter в статьях

`booklets/iPhone15Pro/index.md`:

```yaml
---
title: iPhone 15 Pro
ident: iPhone 15 Pro
designation: Флагман Apple 2023 года, титановый корпус

manufacturer: apple
category: flagship
form_factor: slab
audience:
  - consumer
  - business
---

## Характеристики {#specifications}

...
```

`booklets/RedmiNote13/index.md`:

```yaml
---
title: Redmi Note 13
ident: Redmi Note 13
designation: Бюджетный смартфон Xiaomi

manufacturer: xiaomi
category: budget
form_factor: slab
audience:
  - consumer
---

## Характеристики {#specifications}

...
```

**Правила:**

- `ident` / `designation` — опциональные, для отображения.
- `manufacturer` / `category` / `form_factor` — одиночные слаги
  (совпадают с `dimensions.<dim>.items.<slug>`).
- `audience` — multi (список). Разрешается несколько значений.

### 4.3. `dimensions.yaml`

```yaml
dimensions:
  manufacturer:
    title: Производитель
    items:
      apple:   { dir: "Manufacturers/Apple",   title: "Apple" }
      samsung: { dir: "Manufacturers/Samsung", title: "Samsung" }
      xiaomi:  { dir: "Manufacturers/Xiaomi",  title: "Xiaomi" }

  category:
    title: Категория
    items:
      flagship: { dir: "Categories/Flagship", title: "Флагман" }
      midrange: { dir: "Categories/Midrange", title: "Средний сегмент" }
      budget:   { dir: "Categories/Budget",   title: "Бюджетный" }

  form_factor:
    title: Форм-фактор
    items:
      slab:     { dir: "FormFactors/Slab",     title: "Классический" }
      foldable: { dir: "FormFactors/Foldable", title: "Складной" }
      flip:     { dir: "FormFactors/Flip",     title: "Раскладушка" }

  audience:
    title: Аудитория
    items:
      consumer: { dir: "Audiences/Consumer", title: "Пользователь" }
      business: { dir: "Audiences/Business", title: "Бизнес" }
```

### 4.4. Генерация `catalog.en.json`

**Путь A — вручную** (быстро для первого эксперимента).

Пишем `docs/en/_generated/catalog.en.json` руками, скриптом-однострочником
или через `collect-catalog` (см. Путь B). Для примера — минимальный
`catalog.en.json`:

```json
{
    "docsRoot": "/abs/path/docs/en/booklets",
    "modules": {
        "iPhone15Pro": {
            "dir": "iPhone15Pro",
            "id": "1",
            "ident": "iPhone 15 Pro",
            "manufacturers": ["apple"],
            "categories": ["flagship"],
            "form_factors": ["slab"],
            "audiences": ["consumer", "business"],
            "designation": "Флагман Apple 2023 года, титановый корпус"
        },
        "RedmiNote13": {
            "dir": "RedmiNote13",
            "id": "2",
            "ident": "Redmi Note 13",
            "manufacturers": ["xiaomi"],
            "categories": ["budget"],
            "form_factors": ["slab"],
            "audiences": ["consumer"],
            "designation": "Бюджетный смартфон Xiaomi"
        }
    },
    "dimensions": {
        "manufacturer": {
            "items": {
                "apple":  { "dir": "Manufacturers/Apple",  "title": "Apple" },
                "xiaomi": { "dir": "Manufacturers/Xiaomi", "title": "Xiaomi" }
            }
        },
        "category": {
            "items": {
                "flagship": { "dir": "Categories/Flagship", "title": "Флагман" },
                "budget":   { "dir": "Categories/Budget",   "title": "Бюджетный" }
            }
        },
        "form_factor": {
            "items": {
                "slab": { "dir": "FormFactors/Slab", "title": "Классический" }
            }
        },
        "audience": {
            "items": {
                "consumer": { "dir": "Audiences/Consumer", "title": "Пользователь" },
                "business": { "dir": "Audiences/Business", "title": "Бизнес" }
            }
        }
    },
    "index": {
        "manufacturer": { "apple": ["iPhone15Pro"], "xiaomi": ["RedmiNote13"] },
        "category":     { "flagship": ["iPhone15Pro"], "budget": ["RedmiNote13"] },
        "form_factor":  { "slab": ["iPhone15Pro", "RedmiNote13"] },
        "audience":     { "consumer": ["iPhone15Pro", "RedmiNote13"], "business": ["iPhone15Pro"] }
    }
}
```

**Путь B — через `collect-catalog`** (автоматическая генерация из
frontmatter).

Требует:
- `_registry/fields.yaml` — описание, какие frontmatter-поля в какие
  «field name» каталога маппятся (сейчас **захардкожен** под `Модуль`
  и `actor`/`capability`/`layer`/`family` в `_fields.js` — переработка
  под второй проект — отдельная задача, см. §7);
- `_registry/dimensions.yaml` — справочник измерений;
- `--module-prefix` — префикс папок-модулей. Для телефонных буклетов
  папки `iPhone15Pro` не начинаются с `Модуль` — `collect-catalog`
  сейчас отфильтрует их, нужна правка `matchModuleDir` или
  `--module-prefix=` + фикс регекса.

**Рекомендация:** для первого запуска — Путь A. Когда макет
устраивает — переходим на Путь B (после доработки `collect-catalog`,
§7).

### 4.5. `feature-map.config.json`

`docs/en/_generated/feature-map.config.json`:

```json
{
    "outputPathTemplate": "{lang}/booklets/FM/map.md",
    "moduleHrefAnchor": "specifications",
    "moduleHrefTemplate": "/{docsRootRel}/{dir}/index.html#{anchor}",

    "stripDimensions": ["manufacturer", "audience"],
    "stripLabels": {
        "manufacturer": "Производитель",
        "audience": "Аудитория"
    },

    "rowDimension": "form_factor",
    "columnDimension": "category",

    "dimToFieldMap": {
        "manufacturer": "manufacturers",
        "category": "categories",
        "form_factor": "form_factors",
        "audience": "audiences"
    },

    "title": "Карта буклетов",
    "sectionType": "Page",
    "counterPlaceholder": "Показано: —",
    "resetButtonText": "Сбросить все",
    "emptyCellSymbol": "·"
}
```

**Что здесь важно:**

- `outputPathTemplate` — с маленькой буквы `booklets`, потому что URL
  строится из пути. Если папка в docs — `booklets/`, то и здесь
  `booklets/`.
- `stripDimensions` = `["manufacturer", "audience"]` — два фильтра
  над сеткой. `form_factor` и `category` идут в сетку, поэтому
  как strip не нужны (кликом по заголовку строки/колонки они всё
  равно фильтруются).
- `rowDimension: "form_factor"`, `columnDimension: "category"` —
  у нас в примере только `slab` (один форм-фактор) и `flagship`/`budget`
  (две категории). Матрица 1×2, но в реальном проекте с 3 форм-факторами
  и 3 категориями — 3×3.

### 4.6. Запуск

```bash
# Из target-project (docs/)
cd docs

# 1. Генерация map.md
node ./plugins/diplodoc-helper-cli.js emitFeatureMap \
    --lang=en \
    --catalog=./en/_generated/catalog.en.json \
    --config=./en/_generated/feature-map.config.json

# Ожидаемый вывод:
# ✅ feature-map: /abs/path/docs/en/booklets/FM/map.md
#    strips=2  grid=1×2

# 2. Сборка docs (Diplodoc)
npx @diplodoc/cli -i ./docs -o ./build

# 3. Инжект CSS+JS в HTML-страницы с data-feature-map
node ./plugins/diplodoc-helper-cli.js featureMapInject --buildDir=./build
# Ожидаемый вывод:
# [feature-map] CSS+JS инжектированы в N HTML, ошибок: 0

# 4. Открыть в браузере
# ./build/en/booklets/FM/map.html
```

**Если `emitFeatureMap` не находит `catalog`:** проверь `--catalog=`
или `--generated-dir=` (второй — если хочется дефолтного имени
`catalog.<lang>.json` в нестандартной папке).

**Если `featureMapInject` инжектит 0 HTML:** путь `--buildDir=` неверный.
Он должен указывать на корень собранной документации (`./build`),
а не на `./docs/build`. И внутри должен быть хоть один `.html` с
`<div data-feature-map>`.

### 4.7. Результат

- Открывается `/en/booklets/FM/map.html` — карта с двумя strips
  (Производитель, Аудитория), матрицей «Форм-фактор × Категория»,
  карточками `iPhone 15 Pro` и `Redmi Note 13` в нужных ячейках.
- Клик по «Apple» в фильтре: `Redmi Note 13` сереет.
- Клик по карточке `iPhone 15 Pro`: открывает `/en/booklets/iPhone15Pro/index.html#specifications`.
- Наведение на «Xiaomi» в фильтре: `iPhone 15 Pro` получает
  пунктирную обводку (исчезнет при клике), `Redmi Note 13` — сплошную
  (останется).

---

## 5. CLI cheatsheet

```bash
# === Генерация catalog.json ===

# Вручную — Path A (см. §4.4), просто положить файл.

# Через collect-catalog — Path B (нужна доработка под не-Модуль проекты, §7)
node ./plugins/diplodoc-helper-cli.js collectCatalog \
    --lang=en \
    --docs-root=./en/booklets \
    --registry=./_registry/dimensions.yaml \
    --module-prefix="" \
    --out=./en/_generated/catalog.en.json

# === Генерация map.md ===

node ./plugins/diplodoc-helper-cli.js emitFeatureMap \
    --lang=en \
    --catalog=./en/_generated/catalog.en.json \
    --config=./en/_generated/feature-map.config.json \
    --out=./en/booklets/FM/map.md         # опционально: если нужен путь вне outputPathTemplate

# Без --config — дефолтный конфиг (Модули/, actor/capability/layer/family)
node ./plugins/diplodoc-helper-cli.js emitFeatureMap --lang=ru

# === Сборка + инжект ===

npx @diplodoc/cli -i ./docs -o ./build
node ./plugins/diplodoc-helper-cli.js featureMapInject --buildDir=./build

# === Dev-сценарий (из src/, с override путей) ===

node ./src/plugins/diplodoc-helper-cli.js emitFeatureMap \
    --lang=en \
    --catalog=./docs/en/_generated/catalog.en.json \
    --config=./docs/en/_generated/feature-map.config.json \
    --docs-project-root=./docs

# С --docs-root / --generated-dir (точечно, только для emitFeatureMap)
node ./src/plugins/diplodoc-helper-cli.js emitFeatureMap \
    --lang=en \
    --docs-root=./docs/en/booklets \
    --generated-dir=./docs/en/_generated
```

---

## 6. Ограничения и troubleshooting

### 6.1. `docsRoot` внутри `docsDir`

`catalog.docsRoot` должен быть **внутри** `docsDir` (или `DOCS_DIR`).
Иначе `docsRootRel` начнётся с `..`, и `href` станут `/../...` —
технически битые. Проверка: открыть сгенерированный `map.md`, поискать
`href="/../` — не должно быть.

### 6.2. `dimToFieldMap` обязателен для всех измерений в `rowDimension` / `columnDimension`

Если в `config.json` есть `rowDimension: "form_factor"`, но в
`dimToFieldMap` нет `form_factor: "form_factors"` → `runEmitFeatureMap`
бросит error. Это намеренно: пустая сетка без явной причины хуже,
чем throw.

### 6.3. `stripLabels` — shallow merge

Чтобы изменить **одну** подпись из двух — укажи обе. Иначе вторая
пропадёт (fallback `dim` в stripLabels-логике, т.е. покажет
техническое имя `manufacturer` вместо `Производитель`).

### 6.4. `index` в catalog — с пустыми массивами отфильтруется

Если в `catalog.index.<dim>.<slug> = []`, значение не отрендерится.
Это фича: можно заранее объявить все возможные значения, а
неиспользуемые — не показывать.

### 6.5. Карточка с пустым `ident`

`chipHtml` берёт `mod.ident`. Если в каталоге у модуля нет `ident` —
карточка пустая. Проверь, что в `catalog.modules.<dir>.ident`
заполнен.

### 6.6. `featureMapInject` инжектит 0 HTML

Причины:
- неверный `--buildDir` (должен указывать на корень сборки);
- в HTML нет `<div data-feature-map>` (map.md не собрался или не
  попал в tree сборки — проверь `toc.yaml`);
- сборка не завершена (`build/` пустой).

### 6.7. Warning `MODULE_TYPELESS_PACKAGE_JSON`

При `node ./plugins/X.js` — это перф-предупреждение Node о reparse
`.ts` как ESM. Не ошибка. Уйдёт в CLI-A (прекомпиляция `.ts` → `.js`).

---

## 7. Что нужно доработать для полной автоматизации

Текущий `collect-catalog` (генератор `catalog.json` из frontmatter)
**захардкожен** под проект `Модули`:

1. **`modulePrefix` по умолчанию `'Модуль'`** (`collect-catalog/index.js`,
   функция `matchModuleDir`). Для телефонных буклетов папки `iPhone15Pro`
   не подходят под регекс `/^[A-ZА-ЯЁ0-9 _\-.]/` после пустого префикса
   — `i` (lowercase) не проходит. Варианты:
   - называть папки с заглавной буквы (`Iphone15Pro`);
   - передать `--module-prefix="Phone_"` и называть папки `Phone_iPhone15Pro`;
   - доработать `matchModuleDir`.

2. **`_fields.js`** читает `docs/_registry/fields.yaml` **фиксированной
   структуры**, привязанной к `dimField` / `dimension` / `frontmatterKey`.
   Для нового проекта — свой `fields.yaml` + возможно правка
   `_fields.js` (сейчас читается из `DOCS_DIR/_registry/fields.yaml`,
   override через `--docs-project-root`).

3. **`runCollectCatalog`** использует `dimToField` из полей —
   но `collect-catalog` и `feature-map` не делят конфиг. В идеале
   `dimToFieldMap` из `feature-map.config.json` должен читаться и там
   (сейчас `feature-map` тянет `dimToFieldMap` из своего конфига,
   `collect-catalog` — из `fields.yaml`).

**Минимальный путь для нового проекта сейчас:** Path A (ручной catalog.json),
см. §4.4. **Полная автоматизация** — отдельная волна, требует
переработки `collect-catalog` и `_fields.js` под generic-конфиг.

---

## 8. Roadmap

| Волна  | Что                                                                                        | Статус                                       |
| ------ | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| FM-pre | Smoke-тесты, shim `escHtml`, прямой `Fs_Walk_Directory`                                    | ✅                                            |
| FM-a   | `feature-map.types.ts` + `feature-map.constants.ts`                                        | ✅                                            |
| FM-b   | `--config=<path>` + `dimToFieldMap`                                                        | ✅ (Step 4b)                                  |
| FM-c   | `--docs-root` / `--generated-dir` в `runEmitFeatureMap`                                    | ✅ (Step 4c)                                  |
| FM-d   | `feature-map.client.js` → `client.ts` через esbuild-бандл                                  | отложено (по решению — client остаётся IIFE) |
| FM-e   | `collect-catalog` genericization (module-prefix, fields, merge с feature-map config)       | не начато                                    |
| CLI-A  | Прекомпиляция `src/plugins/**/*.ts` → `.js` рядом (убирает `MODULE_TYPELESS_PACKAGE_JSON`) | не начато                                    |

**Для полноценного второго проекта** нужны FM-e и CLI-A. Пока что
Path A (ручной catalog) + `--config` работают полностью.