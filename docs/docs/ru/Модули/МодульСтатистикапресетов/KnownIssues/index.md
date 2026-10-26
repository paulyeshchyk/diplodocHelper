---
title: KnownIssues
sectionType: Page
pureTitle: KnownIssues
sectionIndex: ""
---


## Известные ограничения

### `version: "1.4"` захардкожен и не связан с версией пакета

```js
const stubVersion = '1.4';
```

Версия `1.54.0` в `package.json` и `1.4` в `presets.yaml` — **разные числа**. Если статья использует `{{ about.version }}`, пользователь увидит «1.4», что не совпадает ни с версией расширения, ни с семантической версией документации (если она есть отдельно). При обновлении релиза `stubVersion` не меняется.

Ожидаемое поведение — читать версию из `package.json` (или из отдельного конфига документации). Реальный фикс: `require('../../../package.json').version` или параметр CLI.

### `author` захардкожен с личным email

```js
const stubAuthor = '[Вавренюк Виктор Андреевич](mailto:vavrenyuk@ascon.by)';
```

Это конкретное имя и email — они попадают в `presets.yaml` и, если статья использует `{{ about.author }}`, — в публичную документацию. Для типового проекта это может быть неприемлемо. Как минимум — должно быть в конфиге, а не в коде.

### `default` и `internal` дублируются

Обе секции формируются **одним** вызовом `generateBlock()`, то есть содержат идентичные данные. В `docs-build.js` используется `--apply-presets internal`, `default` не используется нигде.

Смысл дублирования неясен. Возможно, задумывалось разделение на «публичные» и «внутренние» данные (например, `default` без email автора, `internal` с ним), но реализация этого не делает.

Если понадобится «внешняя» и «внутренняя» сборка с разными данными — сейчас это невозможно без правки `generateBlock`.

### `totalArticles` = все статьи всех языков

Модуль не фильтрует по языку — `articles.length` включает и `ru`, и `en`. Если в проекте 400 статей на `ru` и 100 на `en`, `total_articles` = `500`. Пользователь, читающий `{{ stats.total_articles }}` в русской статье, увидит число, включающее английские статьи.

По смыслу — это «общее число статей в проекте», а не «число статей в данной локализации». Может быть намеренно (для сводки), но легко сбивает с толку. `bytescounter`/`contextmap`/`helptagmap` считают отдельно по языкам (у них `matrixData.ru` и `matrixData.en`), `presetsStat` — общее.

Если понадобится по языкам — придётся либо генерировать `presets.ru.yaml` + `presets.en.yaml` (не поддерживается Diplodoc из коробки), либо оставить `presets.yaml` с подсекциями `stats.ru` / `stats.en` и переписать `generateBlock`.

### `totalSections` и `totalChapters` — эвристика по title

Считаются статьи, у которых `title` матчит `/^Раздел\s+\d+/` или `/^Глава\s+\d+/`. То есть — только `index.md`-файлы разделов и глав, у которых title оформлен строго по шаблону `reindexer` (`Раздел N. <название>`).

Проблемы:

- **`Часть` (Part) не считается.** Тип `Part` есть в `FrontMatterSectionTypes`, но в статистике его нет.
- **Соглашение хрупкое.** Если у пользователя title `Раздел 1: Введение` (с двоеточием вместо точки) — не сработает. Если `1. Введение` (без слова «Раздел») — не сработает.
- **Статьи с title «Раздел N …» вне разделов** — тоже попадут в счёт. Например, если пользователь создал статью с таким title, она посчитается «разделом».

Правильный способ — читать `sectionType` из frontmatter, но `helpMap` его не кладёт в `app-help-contents.json`. Так что `presetsStat` вынужден парсить title — обходное решение.

### `reading_time` — «время чтения одной статьи», не всего руководства

```js
const readingTimeNumeric = Math.ceil(avgSizeNumeric / 2500);
```

`avgSizeNumeric` — средний размер **одной** статьи. `2500` — байт в минуту (приблизительно, 2500 символов = ~400 слов). Значит, `reading_time` — **среднее время чтения одной статьи**, не общее.

Если статья пишет:

```md
В руководстве {{ stats.total_articles }} статей. Общее время чтения —
{{ stats.reading_time }} минут.
```

Пользователь прочитает «общее время чтения — 5 минут» и удивится: 487 статей за 5 минут?

Правильно было бы `totalSize / 2500` (общее время) или переименовать поле в `avg_reading_time`. Сейчас название вводит в заблуждение.

### `git-meta.json` — если файла нет и CI запускается

По умолчанию `gitMeta`:

```js
{
    firstCommitDate: 'Январь 2025 г.',
    lastCommitHash: 'unknown',
    lastCommitDate: '',
}
```

В CI без `git-meta.json` (например, разработчик забыл закоммитить):

- `start_date: "Январь 2025 г."` — фиктивная дата;
- `last_update: ""` — **пустая строка** (fallback на `new Date()` в `generateStat` работает только если `lastCommitDate` был непустым... но он пустой из дефолта, а `if (!lastCommitDate)` — сработает, подставит текущее время; так что не пустая, а «сейчас»);

Стоп, перечитываю:

```js
if (!lastCommitDate) {
    const now = new Date();
    lastCommitDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}
```

Да, если `lastCommitDate` пуст — подставляется **текущее время**. То есть на CI без `git-meta.json` в `presets.yaml` попадёт «дата сейчас», что для сборки 2024 года (если такое возможно) будет ложью.

Это **не баг** текущего сценария (разработчик обычно коммитит `git-meta.json`), но потенциальная ловушка.

### `console.warn`/`console.error` без `process.exitCode`

Как и `helptags`/`footnoteNumbering`, при ошибке `presetsStat` **не падает**:

```js
} catch (error) {
    console.error('❌ Ошибка обработки статистики:', msg);
}
```

`docs-build.js` выполняет шаг `periodicStat` и идёт дальше, как будто всё хорошо. Если `app-help-contents.json` отсутствует (например, `helpMap` упал) — `presets.yaml` не обновится, `@diplodoc/cli` соберёт статью с устаревшими `{{ stats.* }}` или с warning-ами о ненайденных переменных.

Правильно было бы `process.exitCode = 1` в `catch` — тогда `docs-build.js` остановится на шаге `periodicStat`, а не продолжит со сломанными данными.

### `periodicStat` в `docs-build.js` между `tocCleanMode` и `contexts`

В `docs-build.js`, фаза `pre`:

```js
cli('helpMap'),
cli('tocCleanMode'),
cli('periodicStat'),
cli('contexts'),
```

`tocCleanMode` — это post-обработчик (`injectCleanMode`), он должен идти **после** `@diplodoc/cli`. Но стоит в `pre` — до сборки. Это **отдельный баг** `docs-build.js`, не связанный с `presetsStat`, но обращающий на себя внимание при чтении порядка шагов.

`presetsStat` **не зависит** от `tocCleanMode` (тот не читает `presets.yaml` и не пишет его). Так что баг `docs-build.js` на `presetsStat` не влияет, но при отладке стоит помнить: «если `tocCleanMode` не сработал — это не `presetsStat` виноват».

### `STAT_FILENAME` захардкожен

```js
const STAT_FILENAME = 'app-help-contents.json';
```

В `helpmap.config.js`:

```js
outputFileName: 'app-help-contents.json',
```

Два места, одно значение. Если `helpmap.config.js` изменится — `presetsStat` молча сломается (файл не найден). Импорт `{ outputFileName }` из `helpmap.config` устранил бы дублирование.

### `presets.yaml` — «сгенерированный файл в `docs/`»

Файл живёт в `docs/presets.yaml`. Это нестандартное место для генерируемого артефакта — обычно генерируемое кладут в `build/` или отдельный `_generated/`. Но Diplodoc ищет `presets.yaml` именно в корне `docs/`, так что без переопределения пути (если оно есть) не обойтись.

Практические последствия:

- если `presets.yaml` не в `.gitignore` — будет «шумный» diff на каждом релизе;
- если в `.gitignore` — новый клон репозитория не соберётся без предварительного `periodicStat` (что нормально для пайплайна, но неочевидно для новичка).

Сейчас `.gitignore` содержит `**\build`, `**\node_modules`, `**/dist`, `**/coverage`. `presets.yaml` **не** в игноре — значит, коммитится.