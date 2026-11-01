---
title: Модуль. Сборщик каталога
sectionType: Page
pureTitle: Сборщик каталога
context: catalog, frontmatter, registry, pre-processing, yaml
capability: reestr
family: fam-docs-registry
layer: pre-processing
ID: 50
ID_Group: 8
ID_Type: 2
Идентификатор: 'collectCatalog'
designation: 'Собирает frontmatter всех модулей в catalog.json — единый источник правды для page-legend и modules.md'
folder: 'plugins/docs-registry/collect-catalog/index.js'
entrypoint: 'runCollectCatalog(argv)'
role: 'Индексер'
version: '1.0.0'
---

# README: collect-catalog

> Разработческая документация. Стиль — как у описаний модулей проекта
> (см. `docs/ru/Модули/Реестр/МодульX/index.md`).
> Если промоутится в реестр — frontmatter в конце файла.

## Назначение

`collect-catalog` — **корень** всей цепочки docs-registry. Он читает frontmatter всех папок `Модуль*`, строит инвертированный индекс по трём измерениям (`family`, `layer`, `capability`) и пишет `_generated/catalog.<lang>.json`. Файл — единый источник правды для `build-page-legend` и `render-modules`.

Без него: каждый потребитель ходил бы по ФС самостоятельно, а строгая валидация slug'ов (есть ли `fam-illustrations` в `dimensions.yaml`?) размазалась бы по двум скриптам.

`catalog.json` содержит:

- `modules` — все модули: `id`, `ident`, `designation`, `role`, `families[]`, `layers[]`, `capabilities[]`;
- `dimensions` — копия реестра (колонки для `render-modules`, `dir`/`title` для ссылок в `build-page-legend`);
- `index` — `{family: {slug: [modDir…]}, layer: …, capability: …}` — natural sort по `ID`;
- `warnings` — пустые измерения, отсутствующие папки, невалидный YAML;
- `registryPath` — путь к реестру (для сообщений об ошибках).

## Применение

**Когда использовать:** обязательно — первым шагом в `pre`-фазе `docs-build.js`. Также — вручную после добавления/переименования модуля или правки `dimensions.yaml`.

**Когда НЕ использовать:** никогда «в обход» — без `catalog.json` не заработают ни `build-page-legend`, ни `render-modules`.

**Альтернативы:** нет. Инвертированный индекс — единственный вход в цепочку.

**Типичный сценарий:**
```
docs-build.js (pre) → catalog → pageLegend + renderModules → reindexFigures → …
```

## Как это работает

### Фаза 1. Реестр

Читает `docs/_registry/<lang>.yaml`, при отсутствии — `dimensions.yaml`. Ожидает структуру `{dimensions: {family: {items: {...}}, …}}`. Отсутствие `.dimensions` — `exit 1`.

### Фаза 2. Обход модулей

Рекурсивно по `docs/<lang>/Модули/`. Пропускает `node_modules`, `.git`, `_generated`, `_includes`, `_registry`. Модуль — папка, имя которой начинается с префикса (`--module-prefix=Модуль`) + заглавная/цифра/разделитель, и в которой есть `index.md`. Разделитель пробела не обязателен: `МодульCLI`, `Модуль CLI`, `Модуль_JSON` — все валидны.

### Фаза 3. Парсинг frontmatter

`js-yaml`, `fm.family` / `fm.layer` / `fm.capability` — массив (YAML-массив или строка через запятую). `parseListValue` нормализует оба варианта.

### Фаза 4. Строгая валидация slug

Все три поля модуля должны ссылаться на `slug` из реестра. Если хоть один slug неизвестен — **exit 1** с группированным выводом:

```
❌ Ошибка валидации каталога: 3 неизвестных значений
  family: "fam-illustrations" — в 3 модул.
    например: Реестр/МодульИллюстрации
📖 Как исправить:
  1. Откройте _registry/dimensions.yaml
  2. ...
```

Флаг `--lenient` — продолжает с `warnings` (для отладки).

### Фаза 5. Индекс + сорт

Инвертированный индекс из `modules`, ключи — `slug`. Внутри каждого — natural sort по `ID`: `8.2-032` < `10.2-010` (не лексикографически).

### Фаза 6. Запись

`_generated/catalog.<lang>.json`, pretty-print, `\n` в конце. `--dry-run` — не пишет.

## Режимы работы

### CLI

| Опция | По умолчанию | Что |
|---|---|---|
| `--lang` | `ru` | язык |
| `--docs-root` | `<docs>/<lang>/Модули` | корень модулей |
| `--registry` | `<docs>/_registry/<lang>.yaml` → `dimensions.yaml` | реестр |
| `--out` | `<docs>/_generated/catalog.<lang>.json` | выход |
| `--module-prefix` | `Модуль` | префикс папки |
| `--lenient` | — | не падать на неизвестных slug |
| `--probe` | — | показать найденное, ничего не писать |
| `--dry-run` | — | не писать catalog.json |
| `--verbose` | — | все warnings |

### Сборочный пайплайн

`docs-build.js → STEPS.pre[1]`:
```js
cli('catalog', '--lang=ru'),
```

CLI-команда `diplodoc-helper-cli.js catalog --lang=ru`.

## Связи

- **Вниз по цепочке** — `build-page-legend` читает `catalog.dimensions.<dim>.items[slug]` для ссылок; `render-modules` читает `catalog.index` и `catalog.dimensions.<dim>.columns`.
- **С `validate-registry`** — параллельная ручная утилита: проверяет только `dir` из реестра (существуют ли папки). `collect-catalog` тоже это проверяет (warning), но главная его роль — модули + индекс.
- **С `_registry/dimensions.yaml`** — источник всех slug'ов и `dir`. Новое измерение подхватывается без правки кода, если блок добавлен в реестр.
