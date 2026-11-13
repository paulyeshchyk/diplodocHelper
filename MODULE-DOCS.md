# Модульная документация: `README.md`, `index.md`, `usage.md`

> Регламент для модулей `diplodocHelper` и их статей в «Руководстве по diplodocHelper».
> Версия: 1.0.0 · Обновляется при изменении контракта `ModuleDef`, frontmatter-полей
> `_fields.yaml` или структуры guide.

---

## 0. Зачем этот документ

Каждый модуль `diplodocHelper` имеет **три точки входа для читателя**:

1. **Разработчик** открывает `src/plugins/<name>/README.md` — что экспортит, какие флаги, от чего зависит.
2. **Пользователь расширения** читает статью в guide — что делает, как включить, примеры.
3. **DevOps/MES-оператор** — `plugins/<name>/README.md` (после `installScripts`) — как конфигурится в `plugins.config.yaml`.

Эти аудитории **не пересекаются**, поэтому файлы **тоже не должны пересекаться**.
Регламент описывает, какой файл для какой аудитории, что в нём обязательно, а что — антипаттерн.

---

## 1. Три аудитории — три вопроса

| Аудитория | Что спрашивает | Где ищет |
|---|---|---|
| Разработчик модуля | «Что экспортит? Какие `args`? От чего зависит?» | `src/plugins/<name>/README.md` |
| Пользователь расширения | «Что делает? Как включить? Как настроить?» | `docs/docs/<lang>/Модули/<МодульName>/index.md` + `usage.md` |
| DevOps / CI-инженер | «Как конфигурится? Какие флаги в yaml?» | `plugins/<name>/README.md` (после `installScripts`) |

Один файл не покроет все три хорошо — либо раздуется, либо размылится.
Поэтому — **три файла, три роли, ноль дублирования**.

---

## 2. Три файла — три роли

| Файл | Аудитория | Что содержит | Когда обновляется |
|---|---|---|---|
| `src/plugins/<name>/README.md` | Разработчик | API (`load`, `args`, `dependsOn`), зависимости, entry points, тесты, миграция | Меняется `ModuleDef`, `args`, API |
| `docs/docs/<lang>/Модули/<МодульName>/index.md` | Пользователь (навигация) | Frontmatter для `catalog.json`, короткое описание, ссылки на `usage.md` | Меняется frontmatter, короткое описание |
| `docs/docs/<lang>/Модули/<МодульName>/usage.md` | Пользователь (полное) | Сценарии, параметры, примеры, troubleshooting | Меняется UI/UX расширения |

**Правило-мнемоника:**

> **README.md** — контракт для кода.
> **index.md** — визитка в guide.
> **usage.md** — инструкция для пользователя.
>
> Это **не** «полная и краткая версия одного». Это **три разные вещи про один модуль**.

---

## 3. `src/plugins/<name>/README.md` — контракт для кода

### 3.1. Обязательные разделы

| Раздел | Обязателен | Что |
|---|---|---|
| `# <name>` | ✅ | Имя модуля, как в `ModuleDef.name` |
| `## API` | ✅ | `load()` → `ModuleImpl`, ключи `opts` (с типами и default) |
| `## Зависимости` | ✅ | Внутренние модули/утилиты, на которые опирается |
| `## Entry point` | ✅ | CLI-команда и module-имя в `plugins.config.yaml` |
| `## Config (L3)` | ✅ | Путь к `plugin.config.{yaml,json}` (dev + runtime) |
| `## Тесты` | ✅ | Имя `.test.ts`, номера кейсов `00.X.Y#N` |
| `## Regression` | ⚠️ опционально | Cross-module invariants, ссылки на parity-тесты |
| `## Миграция` | ⚠️ опционально | Wave `N` из `REFACTORING.md` |
| `## Что НЕ делает` | ⚠️ опционально | Границы ответственности |

**Frontmatter в README.md — не нужен.** `catalog.json` читает frontmatter из
`docs/docs/<lang>/Модули/<МодульName>/index.md`, а не из `src/plugins/`.

### 3.2. Шаблон

````markdown
# <name>

## API

`load() → ModuleImpl { run(opts) }`

`opts` — см. `<name>.module.ts::args`:

| Ключ | Тип | Default | Описание |
|---|---|---|---|
| `<key>` | `string` | `'ru'` | ... |
| `<flag>` | `boolean` | `false` | ... |

## Зависимости

- `cli/module-helpers.ts` — `resolveDocsDir`, `resolveBuildDir`
- `utils/fs/Fs_Walk_Directory.ts` — обход дерева
- `<другой модуль>` — ...

## Entry point

- **CLI:** `diplodoc-helper <name> [--flag=...]`
- **Pipeline:** `- module: <name>` в `plugins.config.yaml`, фаза `pre|build|post`

## Config (L3)

`src/plugins/<name>/plugin.config.{yaml,yml,json}` (dev override) →
`<install>/plugins/<name>/plugin.config.{yaml,yml,json}` (runtime).

Приоритет merge: **L2 > L1 > L3 > L4** (`pipeline.merge.ts`).

## Тесты

`<name>.module.test.ts` — `00.7.2#<N>..#<M>`.

## Regression

- `00.X.Y#<N>` — parity с `<related module>`
- `00.7.2#<N>` — legacy-контракт `{success, failed}` (warn, не throw)

## Миграция

Wave `<N>` — `REFACTORING.md §<N>`. Legacy-источник: `<legacy.js>`.

## Что НЕ делает

- Не создаёт `<X>`
- Не чистит `<Y>`
````

### 3.3. Пример: `collectCatalog`

`src/plugins/docs-registry/collect-catalog/README.md` — существующий пример
полного dev-README. Из него взят шаблон. Если хочешь увидеть его в живом
виде — открой файл в репо (он покрывает все 8 разделов).

---

## 4. `docs/docs/<lang>/Модули/<МодульName>/index.md` — визитка в guide

### 4.1. Frontmatter — обязателен

Frontmatter — **единственный источник данных** для `catalog.json` →
`feature-map` → `page-legend` → `render-modules`. Без него модуль не попадёт
в `feature-map` и `Реестр`.

Обязательные поля (сверься с `_fields.yaml`):

```yaml
---
title: Модуль. <Name>                         # title для guide-навигации
sectionType: Page
pureTitle: <Name>                             # → ident в catalog
context: <теги через запятую>                 # → страница contexts
capability: <slug>                            # из dimensions.yaml.capability.items
family: <slug>                                # из dimensions.yaml.family.items
layer: <slug>                                 # из dimensions.yaml.layer.items
ID: <N>                                       # числовой id (для сортировки)
Идентификатор: '<name>'                       # CLI-имя модуля (backtick в legend)
designation: '<одно предложение>'             # → tooltip в feature-map
folder: 'plugins/<name>/...'                  # путь в src
entrypoint: '<function>(argv)'                # функция entry
role: '<Роль>'                                # «Индексер», «Генератор», ...
version: '<x.y.z>'                            # semver
---
```

`ID_Group`, `ID_Type`, `input`, `output` — опционально.
`enabled`/`disabled` модуля — в `plugins.config.yaml`, **не** в frontmatter.

### 4.2. Обязательные разделы

| Раздел | Обязателен | Что |
|---|---|---|
| `# <Name>` | ✅ | H1, совпадает с `pureTitle` |
| `> <одно предложение>` | ✅ | Короткое описание (= `designation`) |
| `## Что делает` | ✅ | 3–7 пунктов списком |
| `## Как включить` | ✅ | Фрагмент `plugins.config.yaml` |
| `## CLI` | ⚠️ если применимо | `diplodoc-helper <name> [--flag]` |
| `## Ссылки` | ✅ | Ссылки на `usage.md`, `examples.md`, `troubleshooting.md` |

**Что НЕ должно быть в `index.md`:**
- Полная таблица параметров (`--flag`, типы, default) — это в `usage.md`.
- Скриншоты UI — это в `usage.md`.
- Номера тестов `00.X.Y#N` — это в `README.md`.
- `opts`-структура — это в `README.md`.

### 4.3. Шаблон

````markdown
---
title: Модуль. <Name>
sectionType: Page
pureTitle: <Name>
context: <тег1>, <тег2>
capability: <slug>
family: <slug>
layer: <slug>
ID: <N>
Идентификатор: '<name>'
designation: '<одно предложение>'
folder: 'plugins/<name>/...'
entrypoint: '<entry>(argv)'
role: '<Роль>'
version: '<x.y.z>'
---

# <Name>

> <Одно предложение: что делает модуль.>

## Что делает

- <пункт 1>
- <пункт 2>
- <пункт 3>

## Как включить

`plugins.config.yaml`:

```yaml
stages:
  pre:
    - module: <name>
      options: { <flag>: <value> }
```

## CLI

```
diplodoc-helper <name> [--flag]
```

## Ссылки

- [Использование](usage.md)
- [Примеры](examples.md)
- [Troubleshooting](troubleshooting.md)
````

### 4.4. Пример: `МодульCLI`

`docs/docs/ru/Модули/Registry/МодульCLI/index.md` — существующий пример
полного frontmatter с `ID`, `family`, `capability`, `layer`, `designation`.
Структура H1 + короткое описание + `## Что делает` + `## Ссылки` — то, что
нужно. Если чего-то не хватает (например, `## CLI`) — добавить.

---

## 5. `docs/docs/<lang>/Модули/<МодульName>/usage.md` — инструкция для пользователя

### 5.1. Обязательные разделы

| Раздел | Обязателен | Что |
|---|---|---|
| `# <Name>: использование` | ✅ | H1 |
| `## Когда использовать` | ✅ | 2–4 сценария, в которых модуль уместен |
| `## Когда НЕ использовать` | ✅ | Границы; что вместо него |
| `## Пошагово` | ✅ | Пошаговая инструкция: 1, 2, 3… |
| `## Параметры` | ⚠️ если применимо | Таблица `флаг / тип / default / описание` |
| `## Примеры` | ✅ | ≥1 полный пример «до / команда / после» |
| `## Troubleshooting` | ⚠️ если применимо | Симптом → причина → решение |
| `## Ссылки` | ⚠️ опционально | На related-модули |

**Frontmatter в `usage.md`** — минимальный, без полей каталога:

```yaml
---
title: Модуль. <Name>. Использование
sectionType: Page
pureTitle: Использование
---
```

Полный frontmatter (`ID`, `capability`, `family`, …) — только в `index.md`.
`usage.md` не является «модулем» для `catalog.json`.

### 5.2. Шаблон

````markdown
---
title: Модуль. <Name>. Использование
sectionType: Page
pureTitle: Использование
---

# <Name>: использование

## Когда использовать

- <сценарий 1>
- <сценарий 2>

## Когда НЕ использовать

- <сценарий>, в котором модуль не нужен. Вместо него — [<other module>](<link>).

## Пошагово

1. Правый клик на папке → **Diplodoc → <Name>**.
2. Укажите `<параметр>`.
3. Дождитесь уведомления `✓ <Name>: готово`.

## Параметры

| Флаг | Тип | Default | Описание |
|---|---|---|---|
| `--flag` | `string` | `'ru'` | ... |
| `--verbose` | `boolean` | `false` | ... |

## Примеры

### Пример 1. <сценарий>

До:

```
<до>
```

Команда:

```bash
diplodoc-helper <name> --flag=value
```

После:

```
<после>
```

### Пример 2. <сценарий>

...

## Troubleshooting

### `❌ <симптом>`

**Причина:** <причина>.
**Решение:** <решение>.

### `⚠️ <симптом>`

**Причина:** <причина>.
**Решение:** <решение>.

## Ссылки

- [<Related>](../<МодульRelated>/index.md)
- [Pipeline](../../Пайплайнсборки/index.md)
````

### 5.3. Пример: `reindexFigures`

«До / команда / после» — обязательная форма примера: пользователь должен
видеть **что изменилось**. В репо это `МодульПереиндексациярисунков/index.md`
(если нет `usage.md` — создай, перенеся примеры из `index.md`).

---

## 6. Что где хранится — правила

### 6.1. Никакого дублирования

| Вопрос | Где ответ | Где **не** ответ |
|---|---|---|
| «Какие `opts` у `load()`?» | `README.md` | `index.md`, `usage.md` |
| «Как включить в yaml?» | `index.md` (фрагмент), `usage.md` (полностью) | `README.md` |
| «Что делает?» | `index.md` (`## Что делает`), `usage.md` (`## Когда использовать`) | `README.md` (там только API) |
| «Какой `default` у флага?» | `README.md` (таблица args) | `index.md` (только «Как включить») |
| «Как выглядит UI?» | `usage.md` (скриншоты, шаги) | `README.md` |
| «Какие тесты?» | `README.md` | `index.md`, `usage.md` |
| «Frontmatter для catalog» | `index.md` | `README.md`, `usage.md` |

### 6.2. Ссылки

**Внутри guide** — относительные ссылки. Работают на build Diplodoc:

```markdown
- [Использование](usage.md)
- [<Related>](../<МодульRelated>/index.md)
- [Pipeline](../../Пайплайнсборки/index.md)
```

**Из guide → `src/plugins/`** — **запрещено**. Guide собирается как
отдельный Diplodoc-проект; `src/` в него не попадает. Ссылка `../../src/plugins/foo/README.md`
на build сломается (404).

**Из `README.md` → guide** — **запрещено** по той же причине: `src/plugins/`
может ставиться в `<MES>/plugins/`, где `docs/docs/` может не быть вовсе.
README должен быть самодостаточен.

**Итог:** три файла **не ссылаются друг на друга**. Только guide → guide
(внутри своего проекта).

### 6.3. Обновления

Меняется что-то в модуле → **триггеры обновления**:

| Что изменилось | Какой файл обновить |
|---|---|
| `ModuleDef.args` (новый флаг, default) | `README.md` (`## API`) + `usage.md` (`## Параметры`) |
| `ModuleDef.dependsOn` | `README.md` (`## Зависимости`) |
| `designation` / `role` | `index.md` (frontmatter + `> description`) |
| `capability` / `family` / `layer` | `index.md` (frontmatter) |
| UI/UX расширения (правый клик, диалоги) | `usage.md` (`## Пошагово` + `## Примеры`) |
| Появился новый сценарий | `usage.md` (`## Когда использовать`) |
| Тесты (новый `00.X.Y#N`) | `README.md` (`## Тесты`) |

---

## 7. Антипаттерны

### ❌ «Полное описание API в `index.md`»

```
## API

load() → ModuleImpl, opts: { lang, dryRun }
```

**Почему плохо:** пользователю расширения не нужен `ModuleImpl`. Это
разработческий контракт, ему место в `README.md`. `index.md` — про «что
делает», а не «как устроено».

**Правильно:** `## CLI` (только пользовательские флаги) или ссылка на `usage.md`.

### ❌ Скриншоты UI в `README.md`

**Почему плохо:** README едет в `<MES>/plugins/` при `installScripts`;
скриншоты туда не попадут (installer копирует `src/plugins/`, но картинки
могут быть в `docs/docs/_assets/images/`). Плюс разработчику скриншоты не нужны.

**Правильно:** скриншоты — в `usage.md` (guide собирает их сам).

### ❌ Дублирование «Что делает» между `index.md` и `usage.md`

**Почему плохо:** через месяц тексты разойдутся. Пользователь найдёт два
противоречащих описания.

**Правильно:** в `index.md` — **3–7 пунктов** + `designation`. В `usage.md`
— **сценарии** («когда», «как»), не «что».

### ❌ Ссылка из guide в `src/plugins/`

```markdown
[См. README](../../../../src/plugins/foo/README.md)
```

**Почему плохо:** на build Diplodoc получает 404. Guide не видит `src/`.

**Правильно:** скопируй нужное в `usage.md` (полное) или `index.md` (краткое).
Или — если это dev-документ — оставь в README без перекрёстных ссылок.

### ❌ `usage.md` без примеров

**Почему плохо:** пользователь не понимает «как это применить». «Пошагово» —
это шаги, но нужен **один полный пример** (до / команда / после).

**Правильно:** ≥1 пример с реальными путями и результатом.

### ❌ Frontmatter в `README.md`

**Почему плохо:** `catalog.json` читает из `docs/docs/.../index.md`, а не из
`src/plugins/`. Frontmatter в README — сирота, никто его не читает.

Исключение: если модуль **легаси** промоутится в реестр через `buildPageLegend`
из `src/` — там frontmatter нужен. Но это deprecated-путь (`collect-catalog`
читает из `docs/docs/`).

### ❌ Тест-номера в `index.md` / `usage.md`

**Почему плохо:** пользователь ищет «что делает», а видит `00.7.2#16`. Шум.

**Правильно:** номера — в `README.md` (`## Тесты`). Если хочется в guide —
отдельный раздел «Для разработчика» со ссылкой на `CONTRIBUTING.md`.

### ❌ Отсутствие `designation` в frontmatter

**Почему плохо:** `feature-map` использует `designation` как tooltip на чипе.
Без него — пустой tooltip, карточка неинформативна.

**Правильно:** `designation` — **одно** предложение, отражающее суть модуля.

---

## 8. Чек-лист перед merge

Скопируй в PR-шаблон:

```markdown
## Модульная документация — checklist

### `src/plugins/<name>/README.md`
- [ ] Есть `# <name>`, `## API`, `## Зависимости`, `## Entry point`, `## Config (L3)`, `## Тесты`
- [ ] `opts`-таблица содержит все `args[].name` с типами и defaults
- [ ] `## Миграция` ссылается на Wave в REFACTORING.md
- [ ] Нет frontmatter (кроме legacy-промоушена)

### `docs/docs/<lang>/Модули/<МодульName>/index.md`
- [ ] Frontmatter содержит `title`, `pureTitle`, `designation`, `ID`, `Идентификатор`, `folder`, `entrypoint`, `role`, `version`
- [ ] `capability` / `family` / `layer` — валидные slug из `dimensions.yaml`
- [ ] `> <одно предложение>` совпадает с `designation`
- [ ] Есть `## Что делает`, `## Как включить`, `## Ссылки`
- [ ] Нет `## API`, нет скриншотов, нет номеров тестов

### `docs/docs/<lang>/Модули/<МодульName>/usage.md`
- [ ] Есть `## Когда использовать`, `## Когда НЕ использовать`, `## Пошагово`, `## Примеры`
- [ ] `## Примеры` содержит ≥1 пример «до / команда / после»
- [ ] `## Параметры` (если применимо) — таблица, синхронна с `args`
- [ ] `## Troubleshooting` (если применимо) — «симптом / причина / решение»
- [ ] Frontmatter минимальный (без `ID`, `family`, …)

### Кросс-файлы
- [ ] Нет дублирования «что делает» между `index.md` и `usage.md`
- [ ] Нет ссылок из guide в `src/plugins/` и обратно
- [ ] При удалении модуля — удалены все три файла
```

---

## 9. Где этот документ живёт

Файл — **regulation**, а не модульная статья. Живёт **в обоих проектах**,
содержимое идентично (одна точка правды на двоих).

### В `diplodocHelper` (dev-репо)

```
<diplodocHelper>/
├── docs/
│   ├── PIPELINE.md             ← pipeline-контракт
│   └── MODULE-DOCS.md          ← этот документ
└── src/plugins/…
```

### В `help for DiplodocHelper` (guide-репо)

```
<help-for-diplodocHelper>/
└── docs/docs/ru/
    └── Соглашения/
        └── Модульнаядокументация/
            └── index.md         ← этот документ как страница guide
```

**Если оба проекта — один репозиторий** (как сейчас в `diplodocHelper`
с `docs/docs/`): достаточно одного файла
`<repo>/docs/docs/ru/Соглашения/Модульнаядокументация/index.md` + ссылка
из `CONTRIBUTING.md`. Дублирование в `docs/MODULE-DOCS.md` — не нужно.

**Если два отдельных репозитория:** держи **одну** копию как канон
(в dev-репо — `docs/MODULE-DOCS.md`), а в guide-репо — страницу
`Соглашения/Модульнаядокументация/index.md`, которая **ссылается** на
канон через `git submodule` или обычную symlink (или CI подтягивает
при build). Не держи две независимые копии — они разойдутся.

---

## 10. Ссылки

- `CONTRIBUTING.md` — общие правила разработки.
- `REFACTORING.md` — план рефакторинга (Wave 1–6).
- `docs/PIPELINE.md` — контракт `plugins.config.yaml` (L1–L4, `init-config`, `--list`).
- `docs/docs/ru/Соглашения/index.md` — текущие соглашения по оформлению.
- `_fields.yaml` — источник допустимых frontmatter-полей для `index.md`.
- `dimensions.yaml` — источник slug'ов для `capability` / `family` / `layer`.

---

**Версия 1.0.0.** Обновляется при изменении контракта `ModuleDef`,
полей `_fields.yaml` или структуры guide. Изменения — через PR с
пометкой `docs(regulation):`.