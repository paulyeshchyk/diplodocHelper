#|
|| **ID** | **Тип** | **Severity** | **Модуль** | **Кратко** | **Подробности** ||
||
KI-004
|
bug
|
critical
|
[`section.Rename`](../МодульПереименованиесекции/index.md), [`reindexer.directories`](../МодульПереиндексацияпапок/index.md)
|
section.Rename / reindexer.directories — возврат старого имени при ошибке
|
{% cut "Развернуть" %}

**Что происходит.** Переименование папки выполняется первым шагом. Если следующий шаг (правка `toc.yaml`, `index.yaml`, `index.md`) бросает исключение — `catch` возвращает **старое** имя папки. Но физически папка уже переименована. На выходе:

- `section.Rename` считает, что «новое имя = старое», и передаёт в обновление ссылок тот же путь — ссылки остаются на несуществующую папку;
- `reindexer.directories` рекурсивно идёт по несуществующему пути — `readdirSync` падает с «файл не найден» на следующем уровне.

Симптом: после неудачной операции часть папок переименована, часть — нет; `toc.yaml` в неконсистентном состоянии; `@diplodoc/cli` не собирает проект.

**Почему.** Нет отката `fs.renameSync` при ошибке на пост-шагах.

**Что исправить.** В `catch` — попытаться откатить `fs.renameSync(newFolderPath, folderPath)`. Либо возвращать фактическое имя и явно сообщать пользователю о частичном успехе.

{% endcut %}
||
||
KI-010
|
bug
|
major
|
[`section.Delete`](../МодульУдалениесекции/index.md), [`file.Delete`](../МодульУдалениефайла/index.md)
|
Удаление папки через force не бросает исключение при неудаче (нет прав, файл занят) — на диске остаётся, пользователь видит «успех»
|
—
||
||
KI-011
|
bug
|
major
|
[`contexts`](../МодульКонтексты/index.md), [`contextmap`](../МодульКартаконтекстов/index.md), [`context-search.client`](../МодульКлиентскийпоискпоконтекстам/index.md), [`context-tags`](../МодульКонтекстныетеги/index.md), [`presetsStat`](../МодульСтатистикапресетов/index.md)
|
расхождение разделителей в context
|
{% cut "Развернуть" %}

**Что происходит.** Pre-обработка `contexts` режет строку `context:` по запятой **и** пробелу. Post-обработчики (`contextmap`, `context-tags`) и клиенты (`context-search.client`, `presetsStat`) — только по запятой. Если пользователь написал `context: breadcrumb post-processing` (без запятых, что валидно для `contexts`):

- `contexts` создаёт две страницы — `breadcrumb.html` и `post-processing.html`;
- `contextmap` видит один «контекст» с пробелом внутри;
- `context-search.client` не находит статью по `breadcrumb`;
- `context-tags` генерирует один чип «breadcrumb post-processing» со ссылкой на несуществующую страницу.

**Почему.** Разные разработчики в разное время выбрали разные разделители.

**Что исправить.** Унифицировать: `split(/[\s,]+/)` во всех модулях, либо строго `split(',')` во всех (и запретить пробел в `contexts`).

{% endcut %}
||
||
KI-012
|
bug
|
major
|
[`reindexer.directories`](../МодульПереиндексацияпапок/index.md)
|
Обновление заголовка в toc.yaml вносится в память, но следующая сортировка перечитывает файл с диска — новое имя в файл не попадает
|
—
||
||
KI-023
|
bug
|
major
|
[`footnoteAnchors`](../МодульЯкорясносок/index.md)
|
Не идемпотентен: при повторной сборке (или watch) инжектирует скрипт повторно, накапливая дубликаты
|
—
||
||
KI-024
|
bug
|
major
|
[`build.js`](../МодульСборкарасширения/index.md)
|
Скрипт npm run watch, на который ссылается launch.json как preLaunchTask, отсутствует в package.json — отладка через F5 не работает
|
—
||
||
KI-028
|
bug
|
minor
|
[`presetsStat`](../МодульСтатистикапресетов/index.md)
|
Автор и версия захардкожены; reading_time — время чтения одной статьи, а не всего руководства; totalArticles суммирует все языки
|
—
||
||
KI-029
|
bug
|
minor
|
[`context-tags`](../МодульКонтекстныетеги/index.md)
|
Не идемпотентен: при повторной сборке инжектирует скрипт повторно, HTML «толстеет»
|
—
||
||
KI-032
|
bug
|
minor
|
[`context-tags.client`](../МодульКлиентконтекстныхтегов/index.md)
|
Ссылка на страницу контекста строится из label, а не slug; для контекста с пробелом URL не совпадает с именем сгенерированного файла
|
—
||
||
KI-033
|
bug
|
minor
|
[`tocCleanMode`](../МодульРежимбезнавигации/index.md)
|
Не идемпотентен: скрипт дублируется при повторной сборке
|
—
||
||
KI-058
|
bug
|
minor
|
[`linter.links`](../МодульЛинтерссылок/index.md)
|
Быстрое исправление парсит текст диагностики на русском языке — при локализации сообщений перестанет работать
|
—
||
||
KI-059
|
bug
|
minor
|
[`linter.links`](../МодульЛинтерссылок/index.md)
|
Кеш списка файлов и корня проекта глобальный, не сбрасывается при переключении workspace
|
—
||
||
KI-071
|
tradeoff
|
minor
|
[`footnotes`](../МодульСноски/index.md), [`footnoteNumbering`](../МодульСквознаянумерациясносок/index.md)
|
В стандартном сценарии сборки обрабатывается только русский язык; английские сноски не пересчитываются
|
—
||
||
KI-100
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`module.exports` — только 9 из 24
|
{% cut "Развернуть" %}

Экспортируется только `generateHelpMap`, `generateContexts`, `generateBreadcrumb`, `generateTocCleanMode`, `fixFootnoteAnchors`, `reindexFigures`, `generateFigures`, `generateAbbrs`, `generateTerms`, `generateGosts`. Отсутствуют: `generateHelptags`, `generateRoadmap`, `generateContexttags`, `reindexFootnotes`, `renumberFootnotes`, `injectGostsTable`, `injectAbbrTitles`, `injectTermTitles`, `generateNavigationContent`, `injectFootnoteList`.

Для внешних интеграций (require('diplodoc-helper-cli').generateRoadmap) — `undefined`.

{% endcut %}
||
||
KI-101
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
Нет `--help`
|
{% cut "Развернуть" %}

`node ./plugins/diplodoc-helper-cli.js` без аргументов — `command = undefined`, все `if` пропускаются, `process.exit(0)` **молча**. Нет списка команд, нет справки.

Правильно — либо `if (!command) { console.log('Usage: …'); process.exit(0); }`, либо отдельная ветка `--help`.

{% endcut %}
||
||
KI-102
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
Нет валидации команд
|
{% cut "Развернуть" %}

Неизвестная команда (`node cli.js foo`) — все `if` пропускаются, `exit 0` **молча**. Пользователь ожидает `exit 1` + «Неизвестная команда».

{% endcut %}
||
||
KI-103
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`--docsDir` без значения — `undefined`
|
{% cut "Развернуть" %}

<code>
const docsDirIndex = args.indexOf('--docsDir');
const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';
</code>

Если `--docsDir` последним аргументом (`node cli.js helpMap --docsDir`), `args[docsDirIndex + 1] = undefined`, `docsDir = undefined`. В `helpMap` вызове `collectHelpData(undefined)` → `fs.readdirSync(undefined)` → `throw`. Не поймано.

{% endcut %}
||
||
KI-104
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`code return` — не устанавливается при ошибке
|
{% cut "Развернуть" %}

Только `gostsInject` и `footnoteAnchors` устанавливают `process.exitCode = 1`. Остальные 22 команды — `process.exitCode = 0` всегда. `reindexFigures` может вернуть `{ success: false }`, но `diplodoc-helper-cli` это **не** проверяет.

`docs-build.js` **не** останавливается на упавших шагах, потому что exit code = 0.

{% endcut %}
||
||
KI-105
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`roadMap` — `--dataRaw` теряется
|
{% cut "Развернуть" %}

<code>
const dataRaw = args[dataRawIndex !== -1 ? dataRawIndex + 1 : undefined];
generateRoadMap({ docsRoot: docsDir, dataPath, dataRaw, engine: DiagramEngine.MERMAID });
</code>

`generateRoadMap` (`roadmap.js`) читает `options.data`, а не `options.dataRaw`. `--dataRaw` **не работает** (fallback на `dataPath` или `DEFAULT_DATA_PATH`).

{% endcut %}
||
||
KI-107
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`reindexFigures` — `targetLocale` из env
|
{% cut "Развернуть" %}

<code>
const { targetLocale, configObj } = DiplodocConfigFromCli(CONFIG_KEY);
reindexFigures(docsDir, targetLocale, configObj);
</code>

`targetLocale` берётся из `process.env.CLI_LOCALE` (или `defaultLanguage` из конфига). Аргумент `--locale` **не поддерживается**.

{% endcut %}
||
||
KI-108
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`gostsInject` — `findSectionIndexHtml` без `--targetHtml`
|
{% cut "Развернуть" %}

<code>
if (targetHtmlIdx !== -1) {
    targetHtml = path.resolve(args[targetHtmlIdx + 1]);
} else {
    targetHtml = findSectionIndexHtml(outputDir, section);
}
</code>

`findSectionIndexHtml` возвращает `null`, если папка не найдена. Далее `if (!targetHtml &#124;&#124; !fs.existsSync(targetHtml))` → `console.error`, `process.exitCode = 1`. Правильно.

{% endcut %}
||
||
KI-109
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`footnoteList` — `--section` и `--targetHtml` без валидации приоритета
|
{% cut "Развернуть" %}

<code>
if (section) {
    targetHtml = findSectionIndexHtml(outputDir, section);
} else {
    const idx = args.indexOf('--targetHtml');
    targetHtml = path.resolve(args[idx + 1]);
}
</code>

Если `--section` не найден (папка не существует), `targetHtml = null` → `injectFootnoteList({ docsDir, targetHtml: null, … })` → `fs.existsSync(null)` → `false` → `console.error('Не найден целевой HTML: null')`. Не падает, но сообщение кривое.

Если ни `--section`, ни `--targetHtml` не переданы — `section = null`, `idx = -1`, `args[0]` = первая команда. `path.resolve(args[0])` — какой-то путь. Не падает.

Правильно — проверять `if (idx === -1) { console.error('Нужен --section или --targetHtml'); process.exitCode = 1; }` — что **есть** в `footnoteList` ветке, но не в `gostsInject`.

{% endcut %}
||
||
KI-110
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
Кириллица в `argv` на Windows
|
{% cut "Развернуть" %}

`node cli.js gostsInject --section "ГОСТы"` — на Windows `cmd.exe` может передавать кириллицу в неправильной кодировке (`cp1251` вместо UTF-8). `process.argv` содержит искажённую строку, `findSectionIndexHtml` не находит папку, `targetHtml = null`.

Правильно — использовать `--targetHtml` напрямую или `chcp 65001` в обёртке.

{% endcut %}
||
||
KI-111
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
Нет общего `--help` / `--version`
|
{% cut "Развернуть" %}

`--version` не поддерживается. Пользователь не может узнать версию CLI. `package.json` → `1.54.0`, но CLI сам её не выводит.

{% endcut %}
||
||
KI-112
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`docs-build.cmd` — только для Windows
|
{% cut "Развернуть" %}

<code>
@echo off
node "%~dp0docs-build.js" %*
</code>

`%~dp0` — путь к `docs-build.cmd`. `%*` — все аргументы. Для Linux/macOS — надо `node ./docs-build.js` вручную (или `.sh`-обёртку). В `installer` копируется только `.js`, `.cmd` **не** копируется.

{% endcut %}
||
||
KI-113
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`--docsDir` семантика — разная для разных команд
|
{% cut "Развернуть" %}

&#124; Команда             &#124; Что передаётся                   &#124;
&#124; ------------------- &#124; -------------------------------- &#124;
&#124; `helpMap`           &#124; `./docs` (корень, с `ru/`/`en/`) &#124;
&#124; `contexts`          &#124; `./docs` (корень)                &#124;
&#124; `abbrs`             &#124; `./docs` (корень)                &#124;
&#124; `reindexFigures`    &#124; `./docs/ru` (корень **языка**)   &#124;
&#124; `reindexFootnotes`  &#124; `./docs/ru` (корень **языка**)   &#124;
&#124; `footnoteNumbering` &#124; `./docs/ru` (корень **языка**)   &#124;
&#124; `footnoteList`      &#124; `./docs/ru` (корень **языка**)   &#124;

То есть одна и та же `--docsDir` интерпретируется по-разному. Пользователь, привыкший `--docsDir ./docs`, при вызове `reindexFigures --docsDir ./docs` получит: `collectMdFilesByToc('./docs')` — а внутри `docs/` лежат `ru/` и `en/`, и `toc.yaml` в корне нет → `no_toc`. Молчаливый сбой.

{% endcut %}
||
||
KI-114
|
unknown
|
major
|
[`МодульCLI`](../МодульCLI/index.md)
|
`process.exitCode` не сбрасывается между вызовами
|
{% cut "Развернуть" %}

Если пользователь запускает CLI несколько раз в одной Node-сессии (что редко, но возможно через `require`), `process.exitCode` сохраняется. Между разными модулями — конфликт.

Сейчас CLI запускается как отдельный процесс (`node cli.js …`), так что проблемы нет.

{% endcut %}
||
||
KI-115
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`src/scripts/build-docs.js` и `src/scripts/utils` **не существуют** в расширении
|
{% cut "Развернуть" %}

В `installer.config.js`:

<code>
{ src: 'src/scripts/build-docs.js', dest: './build-docs.js' },
{ src: 'src/scripts/utils', dest: './utils' },
</code>

В `src/` есть `plugins/`, `commands/`, `extension.js`, `nls_loader.js`, `nls_ts.js`, `ContextMenuManager.js`, `pasteProvider.js`. **Нет** `scripts/`.

То есть эти два `item` **всегда** пропускаются (`console.warn('[Installer] Источник не найден: …')`). В `showWarningMessage` — `copiedCount = 1` (только `src/plugins` скопирован). То есть пользователь получает «✅ Скрипты успешно установлены» — но только `plugins/`, а `build-docs.js` и `utils/` **не** установлены.

Правильно — либо добавить `src/scripts/build-docs.js` в репозиторий, либо убрать эти два `item` из конфига.

{% endcut %}
||
||
KI-116
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`extensionId = 'paulyestchick.diplodochelper'` — захардкожен
|
{% cut "Развернуть" %}

При форке расширения (смена `publisher` или `name` в `package.json`) — `installer` не найдёт расширение. Сообщение `❌ Не удалось найти расширение с ID "paulyestchick.diplodochelper"`.

Правильно — читать из `context.extension.id` (но `ux_install_scripts` не принимает `context`). Или — из `package.json` через `vscode.extensions.getExtension`.

{% endcut %}
||
||
KI-117
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`copyRecursiveSync` — `ignorePatterns` через `includes`
|
{% cut "Развернуть" %}

<code>
if (ignorePatterns && ignorePatterns.some((pattern) => childItemName.includes(pattern))) {
    return;
}
</code>

`'test'` — совпадёт с `'contest'`, `'latest'`, `'testament'`. `'.test.js'` — с `'foo.test.jsx'`, `'foo.test.js.bak'`. Простое `includes` — слишком широкое.

Правильно — `childItemName === pattern` или `childItemName.endsWith(pattern)`. Или — regex.

{% endcut %}
||
||
KI-118
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`src/plugins` — копируется **всё**, включая `manifest.builder`, `installer`, `roadmap-data.json`
|
{% cut "Развернуть" %}

`installer` копирует **всю** папку `src/plugins/`. Внутри:

- `manifest.builder/` — build-time VS Code-расширения (не нужен пользователю).
- `installer/` — конфиг установки (не нужен).
- `roadmap-data.json` — данные для демо (может понадобиться).
- `contentNavigator/` — модули отчётов (нужны).
- `abbrs/`, `terms/`, `gosts/`, `contexts/`, `helptags/`, `figures/`, `footnotes/` и т.д. — нужны.

**Лишний вес:** `manifest.builder/` (~15 файлов, ~50 KB) — не нужен. `installer/` — не нужен.

Правильно — исключить `manifest.builder`, `installer`, `manifest/config/vscode.config.manager.js` (VS Code-specific) в `ignorePatterns` или явно перечислить `items`.

{% endcut %}
||
||
KI-119
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`copyRecursiveSync` — `fs.statSync(src)` до `existsSync`
|
{% cut "Развернуть" %}

<code>
const exists = fs.existsSync(src);
const stats = fs.statSync(src);
</code>

**Баг:** `fs.statSync(src)` **до** проверки `exists`. Если `src` не существует — `throw ENOENT`, `exists` не сработал.

В цикле `if (!fs.existsSync(srcPath)) continue;` перед вызовом — гарантирует, что `srcPath` существует. Но при **рекурсивном** вызове для дочерних файлов — `fs.statSync(src)` без предварительной проверки. Если дочерний файл исчез между `readdirSync` и `statSync` (race condition) — `throw`.

Правильно — `if (!exists) return;` или `try/catch` вокруг `statSync`.

{% endcut %}
||
||
KI-120
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`srcPath` → `destPath` — не нормализуется `..`
|
{% cut "Развернуть" %}

`path.join(extensionPath, item.src)` — если `item.src = '../evil'`, `srcPath` выйдет за пределы `extensionPath`. В текущем конфиге — только `src/...`, не злонамеренно. Но при ручной правке конфига — риск.

{% endcut %}
||
||
KI-121
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`showOpenDialog` — нет проверки, что выбранная папка **не** внутри расширения
|
{% cut "Развернуть" %}

Если пользователь выберет `<extension>/src/` — копирование `src/plugins/` → `src/plugins/` (рекурсивное копирование в себя). `fs.copyFileSync` бросит `EINVAL` или создаст странную структуру.

Правильно — `if (targetDir.startsWith(extensionPath)) { showWarningMessage('Нельзя копировать расширение в себя'); return; }`.

{% endcut %}
||
||
KI-122
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`items` — только `src` и `dest`, без `optional`
|
{% cut "Развернуть" %}

Если `src` не существует — `console.warn` и `continue`. Пользователь видит `copiedCount = 1` (только `src/plugins`) и `✅ успешно установлены`. То есть **ложный успех** (см. первый пункт).

Правильно — `optional: true` в конфиге или явный список «что должно быть установлено», и проверка после копирования.

{% endcut %}
||
||
KI-123
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`showInformationMessage` — без списка установленного
|
{% cut "Развернуть" %}

`✅ Скрипты успешно установлены в ${targetDir}` — не говорит, **что** установлено. Пользователь не знает, что `build-docs.js` и `utils/` **не** установлены (если их нет в расширении).

{% endcut %}
||
||
KI-124
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
Нет progress bar
|
{% cut "Развернуть" %}

Копирование `src/plugins/` (~100 файлов, ~500 KB) — секунды. Без `withProgress` — «задумчивость». Для `src/plugins` — не критично. Для больших проектов (если добавят `node_modules` по ошибке) — минуты.

{% endcut %}
||
||
KI-125
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`installer` не поддерживает uninstall
|
{% cut "Развернуть" %}

Пользователь, установивший скрипты, не может «откатить» установку через VS Code. Только вручную — удалить `plugins/`, `build-docs.js`, `utils/`.

Правильно — команда `diplodoc-helper.uninstallScripts` (удаляет скопированное). Сейчас нет.

{% endcut %}
||
||
KI-126
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`installer.config.js` — `ignorePatterns` не исключает `manifest.builder`
|
{% cut "Развернуть" %}

См. выше. `manifest.builder` копируется, хотя не нужен.

{% endcut %}
||
||
KI-127
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`installer` не проверяет версию
|
{% cut "Развернуть" %}

Если пользователь установил скрипты из версии 1.54.0, потом обновил расширение до 1.55.0 — скрипты в проекте остались старые. `installer` не сравнивает версии, не предлагает переустановить.

{% endcut %}
||
||
KI-128
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`installer` — единственная команда в `other`, которая **не** про документацию
|
{% cut "Развернуть" %}

Все остальные команды в `other` (`context`, `helptag`, `reindexier`, `abbrs`, `terms`) — операции над документацией. `installer` — «экспорт расширения». Это выбивается из контекста. Пользователь, открывший меню `Прочее`, не ожидает «установить скрипты в другую папку».

Правильно — вынести в отдельное место (например, `Command Palette` без контекстного меню) или в подменю `Debug`.

{% endcut %}
||
||
KI-129
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`src/scripts/build-docs.js` — задуман, но отсутствует
|
{% cut "Развернуть" %}

Судя по конфигу, должен быть **отдельный** `build-docs.js`, отличный от `docs-build.js`. Возможно, это тонкая обёртка для пользователя:

<code>
// src/scripts/build-docs.js
require('../plugins/docs-build.js');
</code>

Или — просто копия. В расширении его **нет** (`src/scripts/` не существует). Значит, `installer` **всегда** копирует только `plugins/`, а `build-docs.js` в проекте пользователя **не появляется**.

{% endcut %}
||
||
KI-130
|
unknown
|
major
|
[`МодульInstaller`](../МодульInstaller/index.md)
|
`utils/` — тоже отсутствует
|
{% cut "Развернуть" %}

`src/scripts/utils/` — не существует. То же самое: `installer` не копирует `utils/` в проект пользователя.

Если `utils/` нужен (например, для пользовательских скриптов), его надо создать.

{% endcut %}
||
||
KI-131
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`manifest` перезаписывает `contributes` полностью
|
{% cut "Развернуть" %}

`contributionInject` делает `{ ...originalPackage, contributes }`. `originalPackage` содержит **все** поля, кроме `contributes` (которое перезаписывается). Если пользователь вручную добавил что-то в `contributes` (например, `keybindings`), и этого нет в декларации — **потеряется**.

Правильно — либо явно документировать «`contributes` полностью генерируется», либо мерджить по ключам (`keybindings` оставить, `commands`/`menus`/`submenus`/`configuration` — перезаписать).

{% endcut %}
||
||
KI-132
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`JSON.stringify(finalManifest, null, 4)` — формат 4 пробела
|
{% cut "Развернуть" %}

`package.json` перезаписывается с 4-пробельным отступом. Если исходный был с 2 — формат изменится, git-diff будет шумным. Для проекта с pre-commit hook (например, prettier) — перезапишется обратно в 2. Мелочь.

{% endcut %}
||
||
KI-133
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`TsConfigParser` — ограниченный парсер TS
|
{% cut "Развернуть" %}

Не полный TS-парсер. Не поддерживает:

- многострочные комментарии (только до первой `*/`);
- `@deprecated`, `@since` (игнорируются);
- вложенные объекты (только плоские поля);
- `enum` как отдельный тип (только union строк);
- `Record<K, V>` — как `object` (без разбора).

Для простого `interface DiplodocConfig` — достаточно. Для сложных конфигов — нет.

{% endcut %}
||
||
KI-134
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`config.parser.tsconfig.js` — regex по JSDoc
|
{% cut "Развернуть" %}

<code>
if (line.trim().startsWith('')) {
    currentComment += '\n' + lines[i];
    i++;
}
</code>

**Стоп.** Здесь опечатка: `line.trim().startsWith('')` — **пустая строка** (всегда `true`, потому что `startsWith('')` всегда `true`). То есть любая строка считается «началом JSDoc». См. «Известные ограничения» — потенциальный баг.

Реальный код, скорее всего, `startsWith('/**')` или похожее. В предоставленном файле — `startsWith('')` (пусто). Возможно, при копировании пробелы потерялись, но это критично: если `startsWith('')` — парсер TS **сломан** (все комментарии собираются как один).

Проверить: `npm run generate-manifest` и посмотреть, корректны ли `description` в `contributes.configuration.properties`. Если пустые или мусорные — баг подтверждается.

{% endcut %}
||
||
KI-135
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`menuItem`/`submenuItem` — порядок аргументов
|
{% cut "Развернуть" %}

<code>
function menuItem(command, when, groupName, groupOrder, order, separator = SeparatorPosition.NONE) {
</code>

Шесть аргументов. В декларации:

<code>
menuItem('diplodoc-helper.createSection', WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_SECTION, GROUP_ORDER.SECTION, 1)
</code>

Пять аргументов (без `separator`). Читается как «createSection — когда IS_FOLDER, группа DIPLODOC_SECTION, порядок SECTION, 1». Порядок `groupName, groupOrder, order` — неинтуитивен (обычно наоборот). При большом количестве команд — легко перепутать.

{% endcut %}
||
||
KI-136
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`ContributionMenuItem` — валидация только «есть command или submenu»
|
{% cut "Развернуть" %}

<code>
if (!command && !submenu) {
    throw new Error('MenuItem must have either "command" or "submenu"');
}
</code>

Не проверяется, что `command` **не** пустая строка, что `when` синтаксически корректен, что `group` соответствует формату. Ошибки всплывут позже — при загрузке расширения (VS Code покажет ошибку валидации `package.json`).

{% endcut %}
||
||
KI-137
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`group` — формат `<prefix><groupOrder>.<groupName>@<order>`
|
{% cut "Развернуть" %}

Если `groupOrder` не число, `groupName` содержит `.`, `@`, `order` — не число — формат сломается. В декларации константы (`GROUP_ORDER.SECTION = 1`, `GROUP.DIPLODOC_SECTION = 'diplodoc.section'`, `order = 1`) — корректные. Но при ручной правке легко ошибиться.

{% endcut %}
||
||
KI-138
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`manifest` не идемпотентен при ручной правке `contributes`
|
{% cut "Развернуть" %}

Если пользователь **вручную** отредактировал `contributes` (добавил команду без декларации), а потом запустил `generate-manifest` — правка **потеряется** (перезаписано). Для разработчиков расширения это норма (единственный источник — декларация), но для тех, кто форкнул — сюрприз.

{% endcut %}
||
||
KI-139
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`diplodoc.config.model.ts` — не TS-файл в прямом смысле
|
{% cut "Развернуть" %}

`manifest/config/diplodoc.config.model.ts` — это `.ts`-файл, но `TsConfigParser` парсит его **как текст** (regex + line-scan). Если добавить в файл что-то, что не соответствует ожиданиям парсера (`enum`, `type`, `class`) — не скомпилируется.

Для маленького интерфейса — работает. Для большого — нет.

{% endcut %}
||
||
KI-140
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`diplodoc.config.model.js` — мёртвый файл?
|
{% cut "Развернуть" %}

В `src/plugins/manifest/config/` есть `diplodoc.config.model.js` (пустой, `module.exports = {}`). Используется? Не видно. Возможно, `TsConfigParser` требовал `.js`-версию (скомпилированный `.ts`), и его создали для совместимости. Или — мёртвый код.

{% endcut %}
||
||
KI-141
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`package.json` → `contributes` — не в git?
|
{% cut "Развернуть" %}

`package.json` содержит `contributes` (сгенерированный). Он **коммитится** в git. При каждом `npm run build` — если декларация изменилась — `contributes` меняется, git-diff шумный.

Можно было бы держать `contributes` в `.gitignore` и генерировать при сборке. Но VS Code требует `contributes` в `package.json` при установке — поэтому нужен **готовый** `contributes`. Значит, коммитится.

{% endcut %}
||
||
KI-142
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`manifest` не проверяет существование `package.json`
|
{% cut "Развернуть" %}

<code>
const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
</code>

Если `package.json` нет — `fs.readFileSync` бросит. `catch` в `contributionInject` ловит, `console.error`, `process.exit(1)`. Правильно.

{% endcut %}
||
||
KI-143
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`manifest` не валидирует `contributes` против схемы VS Code
|
{% cut "Развернуть" %}

`contributes` должен соответствовать [schema](https://code.visualstudio.com/api/references/contribution-points). `manifest` генерирует JSON **без** валидации. Если декларация содержит ошибку (например, `when: 'editorLangId == unknown'`) — VS Code покажет warning при установке, но `manifest` не поймает.

Валидация — задача `vsce package` (пакета для публикации) и самого VS Code при загрузке.

{% endcut %}
||
||
KI-144
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`nls` — не генерируется
|
{% cut "Развернуть" %}

`contributes.commands[].title` — `'%command.md.section.create%'`. Это **NLS-плейсхолдер**, который VS Code разрешает через `package.nls.json` / `package.nls.<locale>.json`. `manifest` **не** проверяет, что ключ `%command.md.section.create%` **есть** в `package.nls.json`.

Если ключа нет — VS Code покажет сам плейсхолдер (`%command.md.section.create%`) в UI. Не падение, но плохо.

{% endcut %}
||
||
KI-145
|
unknown
|
major
|
[`МодульManifest`](../МодульManifest/index.md)
|
`manifest` — единственный модуль, который **пишет** `package.json`
|
{% cut "Развернуть" %}

Это **опасно**: ошибка в `manifest` → `package.json` битый → расширение не загружается. `manifest` не делает backup, не валидирует финальный JSON перед записью. `JSON.stringify` не бросит (если объект сериализуемый). Но если `originalPackage` содержит что-то несериализуемое (например, `BigInt` — маловероятно) — `throw` до `writeFileSync`.

Практически: `package.json` всегда сериализуемый JSON. Ошибка — только в логике (неверные `contributes`).

{% endcut %}
||
||
KI-146
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
Коллизия анкоров при транслитерации
|
{% cut "Развернуть" %}

`abbrAnchorId(abbr)` и `abbrOccurrenceId(abbr, n)` строятся как `abbr-<slugify_latin_alphanumeric(abbr)>[-N]`. Две разные аббревиатуры с одинаковой транслитерацией (`АБВ` и `ABV` → `abv`) дадут одинаковый анкор и «склеятся» в списке вхождений. Диагностики нет — при генерации `index.md` обе записи получат одинаковый `id`, и браузер откроет только первую.

{% endcut %}
||
||
KI-147
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
Настройки `showWarnings` и `showUnused` выключены
|
{% cut "Развернуть" %}

В `abbrs.config.js`:

<code>
module.exports = {
    showWarnings: false,
    showUnused: false,
    usageCutTitle: { ru: 'Встречается в', en: 'Used in' },
    usageVisibleCount: 10,
};
</code>

Баннер «Нет в словаре» и метка «В статях не используется» на странице-указателе не появляются. Информация о неопределённых аббревиатурах всё равно пишется в консоль сборки — но пользователь, читающий статью, её не видит. Включается правкой конфига.

{% endcut %}
||
||
KI-148
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
Выходная папка задаётся только через `abbrs.paths.yaml`
|
{% cut "Развернуть" %}

Путь `Дополнительнаяинформация/Списоксокращений` (ru) / `Additional information/List of abbreviations` (en) фиксирован в YAML рядом с кодом модуля. CLI-аргумента нет. Если пользователю нужна другая папка — правится YAML и пересобирается расширение.

{% endcut %}
||
||
KI-149
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
Папки с именем `abbrs`/`terms`/`contexts`/… пропускаются где угодно
|
{% cut "Развернуть" %}

`SKIP_DIRS` в `abbrs.collector.js` — глобальный по имени, не по пути. Если пользователь создаст `docs/ru/foo/abbrs/` с обычными статьями, они будут проигнорированы при сборе вхождений. То же с `figures`, `roadmap` и т.д. Спасает только переименование папки.

{% endcut %}
||
||
KI-150
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
`<abbr class="…">` полностью игнорируется
|
{% cut "Развернуть" %}

Все три фазы (`extractAbbrsFromFile`, `injectAbbrTitlesIntoHtml`, `lintAbbrs`) пропускают `<abbr class="…">`. Это осознанно: такие теги — зона ответственности модуля `terms` (`class="term"`). Побочный эффект: если пользователь поставит `class` по другой причине (стилизация, семантика), аббревиатура выпадет из словаря и из линтера.

{% endcut %}
||
||
KI-151
|
unknown
|
major
|
[`МодульАббревиатуры`](../МодульАббревиатуры/index.md)
|
Линтер чувствителен к регистру
|
{% cut "Развернуть" %}

`loadAbbrDictionary` и `lintAbbrs` сравнивают ключи как есть: `data-abbr="ОРФ"` не совпадёт с `abbr: орф` в словаре. При ручном заполнении словаря это приводит к ложным «не найдено» в линтере.

{% endcut %}
||
||
KI-152
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
Стили живут вне модуля
|
{% cut "Развернуть" %}

Ни один `.css` не лежит в `src/plugins/abbrs/`. Классы `.dl-abbr-tip`, `.dl-abbr-occ-hidden`, `.dl-abbr-occ-last`, `.dl-abbr-occ-more` и переменная `--dl-abbr-arrow-left` **должны** быть определены в теме или в `_assets/styles/`. Если файл потеряется:

- списки не сворачиваются (скрытые ссылки видны, кнопка «ещё N» висит без визуального эффекта);
- тултипы появляются в левом верхнем углу или без стрелки;
- `dl-abbr-occ-last` ни на что не влияет (стиль-разделитель не применяется).

Явной диагностики нет — клиент работает, но выглядит «сломанным». При обновлении темы или переносе модуля в standalone-пакет — обязательно проверять наличие сопутствующего CSS.

{% endcut %}
||
||
KI-153
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
`MutationObserver` не отключается никогда
|
{% cut "Развернуть" %}

`obs.observe(document.body, { childList: true, subtree: true })` — подписка на все изменения DOM под `body`. После первого рендера это «пустые» срабатывания, но на страницах с активным скроллом, видео, вкладками (как `{% list tabs %}`) число мутаций может быть заметным. Каждая мутация вызывает `initAll()`, который пробегает по всем `.dl-abbr-occ-list` и `.dl-abbr`, проверяет `data-*`-маркеры. Для страниц с большим количеством `<abbr>` это микро-нагрузка на каждое изменение. Идемпотентность спасает от логических ошибок, но не от перебора DOM.

Если понадобится — `MutationObserver` отключается через `window.addEventListener('beforeunload', () => obs.disconnect())`, но такой практики сейчас нет.

{% endcut %}
||
||
KI-154
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
`getBoundingClientRect()` на каждом `mouseenter`
|
{% cut "Развернуть" %}

`reposition()` пересчитывает геометрию тултипа на **каждое** наведение. Это `forced reflow` — браузер сбрасывает layout. При быстром движении курсора по тексту с десятком `<abbr>` это может давать заметные просадки FPS. Пока проблем не зафиксировано (на типичных страницах 1–3 `<abbr>`), но при плотной разметке стоит либо кешировать `tipWidth`/`tipHeight`, либо пересчитывать лениво.

{% endcut %}
||
||
KI-155
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
Работает только при наличии маркера `id="dl-abbr-occ-client"`
|
{% cut "Развернуть" %}

Если инжектор по какой-то причине не отработал (например, шаблон HTML не содержит `</body>`), клиентский скрипт в страницу не попадёт. Проверка — `document.getElementById('dl-abbr-occ-client')` в DevTools. Диагностика на этапе сборки — только в логах `abbrs.injector.js` (сообщение `injectAbbrsClientScript` не выводит ничего, если скрипт уже есть).

{% endcut %}
||
||
KI-156
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
«Ещё/свернуть» — единственная локализация, и она захардкожена
|
{% cut "Развернуть" %}

`injectAbbrsClientScript` в `abbrs.injector.js` формирует подписи по простому условию `lang === 'ru' ? 'ещё' : 'more'`. Для языков, отличных от `ru` и `en` (например, `de`), подписи будут английскими. Добавление нового языка требует правки инжектора — `abbrs.paths.yaml` тут не поможет.

{% endcut %}
||
||
KI-157
|
unknown
|
major
|
[`МодульАббревиатурыКлиент`](../МодульАббревиатурыКлиент/index.md)
|
Polling-fallback срабатывает слишком долго
|
{% cut "Развернуть" %}

Если по какой-то причине `initAll()` никогда не вернёт `> 0` (например, на странице нет ни одного `<abbr>` и ни одного `.dl-abbr-occ-list` — вполне легитимный случай, скажем, «пустая» статья), клиент будет опрашивать DOM 120 раз по 250 мс. Итого 30 секунд таймеров на каждый такой документ. Незаметно по эффекту, но неаккуратно по ресурсам. Ограничение по счётчику есть, но нет условия «если ничего нет — выходим сразу», потому что на момент запуска скрипта Diplodoc ещё может не отрендерить state.

{% endcut %}
||
||
KI-158
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`insertIndentedBlock` удаляет текст на строке левее курсора
|
{% cut "Развернуть" %}

<code>
const rangeToReplace = new vscode.Range(new vscode.Position(position.line, 0), position);
await editor.edit(editBuilder => {
    editBuilder.replace(rangeToReplace, formattedText);
});
</code>

`position` — `editor.selection.active` (курсор). `rangeToReplace` — от **столбца 0** строки до курсора. Всё, что было на строке левее курсора, **удаляется** и заменяется на `<figure>`-блок.

Сценарии:

&#124; Было (курсор — ` &#124; `)                &#124; Ожидание                    &#124; Реальность                                 &#124;
&#124; ---------------- &#124; ----------------- &#124; --------------------------- &#124;
&#124; `                &#124; ` (пустая строка) &#124; Вставка `<figure>`          &#124; OK — `rangeToReplace` пуст                 &#124;
&#124; `                &#124; ` (только отступ) &#124; Вставка `<figure>` с indent &#124; OK — отступ «съест» `indentMultilinedText` &#124;
&#124; `Текст           &#124; `                 &#124; Вставка после `Текст`       &#124; `Текст` **удалён**, остаётся `<figure>`    &#124;
&#124; `# Заголовок     &#124; `                 &#124; Вставка на новой строке     &#124; `# Заголовок` **удалён**                   &#124;
&#124; `- пункт списка  &#124; `                 &#124; Вставка с indent            &#124; `- пункт списка` **удалён**                &#124;

Это не атомарный «replace line start-to-cursor» — это «replace до курсора». Правильный подход:

- если пользователь на пустой строке / с отступом — заменить с 0 до курсора (как сейчас);
- если есть текст — вставить на новой строке: `insert` в `(position.line, line.text.length)` + `\n` или `position` как есть (без replace).

Сейчас модуль «работает» для типичного сценария (вставить на пустую строку), но **ломает содержимое**, если пользователь вызвал не там.

{% endcut %}
||
||
KI-159
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
Linux: `xclip` с `>` не работает
|
{% cut "Развернуть" %}

<code>
function GetImageLinux() {
    let script = 'xclip';
    let args = ['-selection', 'clipboard', '-t', 'image/png', '-o', '>', tempPath];
    return { script, args };
}
</code>

`cp.execFile` **не** использует shell — это прямой `execve`. Аргумент `>` попадёт в `xclip` как литеральная строка `'>'`, а не как перенаправление. `xclip` попытается открыть файл `>` (не найдёт), и вернёт ошибку. Итог: на Linux `getImageFromClipboard` **не работает** — всегда `resolve(null)`, пользователь видит `«В буфере обмена нет изображения (или формат не поддерживается)»`.

Фикс:

<code>
const args = ['-selection', 'clipboard', '-t', 'image/png', '-o'];
cp.execFile('xclip', args, (error, stdout) => {
    if (error) return resolve(null);
    resolve(Buffer.from(stdout, 'binary'));
});
</code>

или через `shell: true` + `>` (менее безопасно).

Плюс `-o` без перенаправления выводит в stdout — `stdout` в callback будет `Buffer` (с `encoding: null` или через `execFile` `encoding: 'buffer'`). Не `readFileSync(tempPath)`.

{% endcut %}
||
||
KI-160
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`getImageFromClipboard` не проверяет наличие команды
|
{% cut "Развернуть" %}

`cp.execFile` при отсутствии `powershell`/`osascript`/`xclip` — `error` с `errno: 'ENOENT'`, `resolve(null)`. Пользователь видит `«В буфере обмена нет изображения»` — хотя проблема в отсутствии инструмента. Сообщение вводит в заблуждение.

Правильно — перед `execFile` проверить `command -v xclip` (или `which`), и если нет — `showErrorMessage('Установите xclip: sudo apt install xclip')`.

{% endcut %}
||
||
KI-161
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`prompt: translate(screenshot.name.prompt)` — без подстановки
|
{% cut "Развернуть" %}

<code>
const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);
const userInput = await vscode.window.showInputBox({
    prompt: translate(nls_ts.screenshot.name.prompt),   // ← без args
    value: defaultFilename,
    …
});
</code>

`prompt` — заголовок `InputBox`, показывает `"{0}_Скриншот"` (с литеральным `{0}`). `value` — предзаполненное поле, содержит `"2024-01-15_12-30-45_Скриншот"`. Пользователь видит «{0}_Скриншот» над полем и заполненное «2024-01-15_12-30-45_Скриншот» в поле. Непоследовательно.

Правильно — `prompt: 'Введите имя файла для скриншота'` (отдельный NLS-ключ) или `prompt: translate(..., timestamp)` (то же значение, что в `value`).

{% endcut %}
||
||
KI-162
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`screenshot.*` — NLS-ключи из другого модуля
|
{% cut "Развернуть" %}

Все NLS-ключи начинаются с `screenshot.` (`screenshot.name.prompt`, `screenshot.saved.info`, `screenshot.error.notsaved` и т.д.). Но модуль называется `image.PasteFromClipboard`. В `package.nls.json` нет ключей `image.*` — используются существующие `screenshot.*`.

Историческое наследие: когда-то был отдельный модуль «вставка скриншота», потом его функциональность слилась с `image.PasteFromClipboard`. Ключи остались.

Практический эффект: если пользователь ищет в `package.nls.json` переводы для «вставки изображения», не найдёт — только `screenshot`. Если решишь переименовать — придётся менять и код, и NLS-файлы.

{% endcut %}
||
||
KI-163
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`altText = userInput.trim()` — не очищен от спецсимволов markdown
|
{% cut "Развернуть" %}

Если пользователь введёт `Привет [мир]`, `altText = "Привет [мир]"`, а `figureBlock`:

<code>
![Привет [мир]](./images/foo.png)
</code>

Markdown-парсер воспримет `[мир]` как начало ссылки. `]` внутри `alt` без экранирования ломает разметку. Аналогично с `)` внутри `alt` — закроет URL.

`buildFigure` не экранирует `altText`:

<code>
const linkBlock = `![${altText}](${url})`;
</code>

Правильно — `altText.replace(/[\[\]]/g, …)` или использовать `slugify_latin_alphanumeric` для alt (но тогда потеряется читаемое имя).

`<figcaption>` тоже содержит `altText` как есть — там `[`, `]` безопасны (это HTML-текст), но markdown-ссылка выше сломается.

{% endcut %}
||
||
KI-164
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`imageExtension` — константа, но `fileName` игнорирует
|
{% cut "Развернуть" %}

<code>
const imageExtension = '.png';

// validateInput
const testPath = path.join(imagesDir, `${cleanName}${imageExtension}`);   // OK
// запись
const fileName = `${cleanName}.png`;                                       // ← hardcoded
</code>

Если кто-то изменит `imageExtension` на `.webp` — `validateInput` проверять будет `.webp`, а `fileName` запишет `.png`. Рассинхрон.

Правильно — везде `${cleanName}${imageExtension}`.

{% endcut %}
||
||
KI-165
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
Буфер всегда конвертируется в PNG
|
{% cut "Развернуть" %}

`getImageFromClipboard`:

- **Windows**: `$image.Save(tempPath, [ImageFormat]::Png)`;
- **macOS**: `clipboard as «class PNGf»` — приводит к PNG;
- **Linux**: `-t image/png` — запрашивает PNG.

Если пользователь скопировал JPEG (например, вставил из файла), буфер возвращает PNG (Windows/macOS конвертируют автоматически). Итог: файл `foo.png`, но исходник был `.jpg`. Это работает для документации (PNG без потерь), но:

- размер файла может быть больше оригинала;
- нет возможности сохранить оригинальный формат;
- если пользователь хотел `.jpg` — не получит.

{% endcut %}
||
||
KI-166
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
Создание `images/` — без учёта `_assets`
|
{% cut "Развернуть" %}

В Diplodoc статика обычно лежит в `_assets/`. Модуль создаёт `images/` рядом с `.md` — это **не** `_assets/`. `@diplodoc/cli` копирует `_assets/` в `build/_assets/`, но `images/` — нет. Изображения в `images/` попадают в `build/` только потому, что они referenced из `.md` (Diplodoc собирает все referenced ресурсы). Но если `.md` не упоминает картинку (например, удалили ссылку) — файл в `images/` «висит» и в `build/` не попадёт.

Плюс — если пользователь предпочитает `_assets/images/`, модуль этого не поддерживает. Путь захардкожен.

{% endcut %}
||
||
KI-167
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`getCursorContext` — используется только `listIndent`
|
{% cut "Развернуть" %}

`getCursorContext` возвращает 6 полей (`isHtml`, `isList`, `listIndent`, `isDirectItem`, `isTable`, `isCustomBlock`, `isInsideBlockBody`, `isBlockHeader`, `blockType`). Модуль использует **только** `listIndent`.

Последствия:

- **внутри `<table>`** — вставка `<figure>` прямо в ячейку (HTML-таблица), что может сломать разметку;
- **внутри `{% note %}`** — вставка `<figure>` внутрь note, что синтаксически валидно, но не то, что ждёт пользователь;
- **внутри HTML-тега** — вставка `<figure>` внутрь `<figcaption>` или `<a href="…">` — сломает HTML.

Правильно — предупреждать, если `isTable` или `isHtml`, или отказывать в операции (как `link.addAnchor`).

{% endcut %}
||
||
KI-168
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`Buffer` ограничен памятью
|
{% cut "Развернуть" %}

`fs.readFileSync(tempPath)` читает весь файл в память. Для типичного скриншота (100 KB–5 MB) — ок. Для видео или большого PNG (50 MB) — `Buffer` поместится, но `getImageFromClipboard` не проверяет размер. На крайнем случае — OOM.

Практически не встречается.

{% endcut %}
||
||
KI-169
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`Timestamp` — UTC, не локальное время
|
{% cut "Развернуть" %}

<code>
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
</code>

`toISOString()` — **UTC**. Для пользователя в UTC+3 скриншот в 12:30 локального времени получит timestamp `2024-01-15_09-30-45` (UTC). Пользователь ожидает локальное время.

Фикс:

<code>
const now = new Date();
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
</code>

{% endcut %}
||
||
KI-170
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
Сообщение об успехе показывает `<slug>.png`, не введённое имя
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(translate(nls_ts.screenshot.saved.info, fileName));
</code>

`fileName = <cleanName>.png`. Если пользователь ввёл `Привет Мир`, `cleanName = privet_mir`, сообщение — `«Картинка сохранена: privet_mir.png»`. Пользователь видит не то, что вводил. Не баг (это реальное имя файла), но требует знания про slugify.

{% endcut %}
||
||
KI-171
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`editor.edit` — без проверки результата
|
{% cut "Развернуть" %}

<code>
await editor.edit(editBuilder => { … });
</code>

Возвращает `Promise<boolean>`. Если `false` (документ readonly) — сообщение об успехе всё равно показывается. Пользователь думает, что скриншот вставлен, но в тексте ничего нет.

Фикс — проверять `applied` и показывать ошибку при `false`.

{% endcut %}
||
||
KI-172
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`uri` из палитры — тихий выход через `!editor`
|
{% cut "Развернуть" %}

Как и в `link.*` — если команда вызвана из палитры без редактора, `showErrorMessage('Нет активного редактора')`. Разница с `section.*`/`link.*`: там `if (!uri) return;` — молча; здесь — с сообщением. Единообразия нет.

{% endcut %}
||
||
KI-173
|
unknown
|
major
|
[`МодульВставкаизображенияизбуфера`](../МодульВставкаизображенияизбуфера/index.md)
|
`image.PasteFromClipboard` не проверяет, что курсор внутри `.md`-файла в папке проекта
|
{% cut "Развернуть" %}

`document.languageId === 'markdown'` — достаточная проверка для VS Code. Но если пользователь открыл `.md` вне `docs/` (например, `README.md` расширения), модуль создаст `images/` рядом с этим `README.md` — вне структуры Diplodoc. При следующей сборке `docs/` эти `images/` не попадут.

Правильно — `getLanguageRoot(document.uri.fsPath)` и предупреждать, если не внутри `docs/<lang>/`.

{% endcut %}
||
||
KI-174
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`workspaceFolders[0]` — мульти-workspace не поддерживается
|
{% cut "Развернуть" %}

<code>
const rootDir = workspaceFolders[0].uri.fsPath;
</code>

В мульти-workspace (несколько папок открыто в VS Code) берётся **первая** папка, а не та, где находится `currentFilePath`. Если пользователь работает с проектом в третьей папке workspace, `collectAllImages` просканирует первую — и в `QuickPick` будут изображения из **другого** проекта.

Фикс — найти папку, содержащую `currentFilePath`:

<code>
const folder = workspaceFolders.find(f => currentFilePath.startsWith(f.uri.fsPath));
const rootDir = (folder ?? workspaceFolders[0]).uri.fsPath;
</code>

{% endcut %}
||
||
KI-175
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`!editor &#124;&#124; languageId !== 'markdown'` — одно сообщение для двух случаев
|
{% cut "Развернуть" %}

Если редактора нет вообще — пользователь видит «Команду можно использовать только в Markdown-файлах». Это вводит в заблуждение: правильнее «Нет активного редактора».

Фикс — разделить:

<code>
if (!editor) {
    vscode.window.showErrorMessage('Нет активного редактора');
    return;
}
if (editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage('Команда работает только в .md');
    return;
}
</code>

{% endcut %}
||
||
KI-176
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`insert` в `selection.active` — выделение не заменяется
|
{% cut "Развернуть" %}

<code>
await editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, markdownLink);
});
</code>

`selection.active` — «активная» позиция курсора (обычно правая граница выделения). Если пользователь выделил слово и вызвал `pasteImageFromList`, ссылка вставится **после** выделения, а выделение останется. Не то, что пользователь ожидает.

`link.Paste` (например) использует `replace(selectionRange, linkText)`, если выделение непустое. Здесь этого нет. См. «Известные ограничения».

Фикс — по образцу `link.Paste`:

<code>
if (!editor.selection.isEmpty) {
    await editor.edit(eb => eb.replace(editor.selection, markdownLink));
} else {
    await editor.edit(eb => eb.insert(editor.selection.active, markdownLink));
}
</code>

{% endcut %}
||
||
KI-177
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Нет `indentMultilinedText` — вставка в список ломает структуру
|
{% cut "Развернуть" %}

Если курсор внутри списка:

<code>
- пункт списка
  &#124;
</code>

`insert` добавит `![*caption*](relative)` без отступа. Получится:

<code>
- пункт списка
![*caption*](relative)
</code>

Что не относится к списку. `image.PasteFromClipboard` использует `getCursorContext().listIndent` — здесь не используется. Нет `cursor.Context` в зависимостях модуля.

Фикс — добавить `getCursorContext` и `indentMultilinedText` (как в `image.PasteFromClipboard`).

{% endcut %}
||
||
KI-178
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`editor.edit` без проверки результата
|
{% cut "Развернуть" %}

<code>
await editor.edit(editBuilder => { … });
</code>

Возвращает `Promise<boolean>`. Не проверяется. Если `false` (документ readonly, например) — сообщение `«Вставлена ссылка»` всё равно показывается. Пользователь думает, что ссылка есть, а её нет.

{% endcut %}
||
||
KI-179
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`caption` с `*` или `]` ломает markdown
|
{% cut "Развернуть" %}

<code>
const markdownLink = `![*${selectedImage.caption}*](${relativeLink})`;
</code>

`caption` для `figure` — текст из `<figcaption>`. Если в нём есть `*` (например, `Рисунок 1. Формула *E=mc²*`), markdown-курсив сломается:

<code>
![*Рисунок 1. Формула *E=mc²**](...)
</code>

Аналогично `]` в caption (например, `Свойства [объекта]`) — закроет alt-текст, всё сломается.

Фикс — экранировать `*` и `]`:

<code>
const safeCaption = String(selectedImage.caption).replace(/([*\]\\])/g, '\\$1');
const markdownLink = `![*${safeCaption}*](${relativeLink})`;
</code>

Или — не оборачивать в `*…*` (курсив в alt-тексте — нестандартно, markdown это не всегда поддерживает).

{% endcut %}
||
||
KI-180
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`extractFigureNumber` — фигуры без номера сортируются первыми
|
{% cut "Развернуть" %}

<code>
const numA = extractFigureNumber(a.caption);   // 0 если нет "Рисунок N"
const numB = extractFigureNumber(b.caption);
if (numA !== numB) return numA - numB;
</code>

`0` < `1` → фигуры без номера идут **до** пронумерованных. Обычно пользователь ожидает **обратное**: сначала «Рисунок 1», «Рисунок 2», …, потом всё, что без номера.

Фикс:

<code>
if (numA === 0 && numB === 0) return 0;   // оба без номера
if (numA === 0) return 1;                  // A без номера → в конец
if (numB === 0) return -1;
return numA - numB;
</code>

Не баг-в-баг, но UX-несоответствие ожиданиям.

{% endcut %}
||
||
KI-181
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Дедупликация теряет информацию о второй статье
|
{% cut "Развернуть" %}

<code>
if (!imageByNormalizedPath.has(key)) {
    images.push(image);
    imageByNormalizedPath.set(key, image);
}
</code>

Если одна и та же картинка использована в `foo.md` и `bar.md` (обе как `![alt](images/x.png)`), в `QuickPick` она появится **один раз** — с `filePath` из первого встреченного (в порядке обхода `FindMdFiles`, обычно недетерминированный).

Пользователь видит `description: 'foo.md'`, хотя картинка есть и в `bar.md`. При выборе вставится ссылка `../foo/images/x.png` — работает, но пользователь мог ожидать `../bar/images/x.png` (или обе в списке).

{% endcut %}
||
||
KI-182
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`ExtractFigures`/`ExtractMdLinks` — последовательный обход
|
{% cut "Развернуть" %}

<code>
for (const fileUri of mdFiles) {
    await ExtractFigures(fileUri.fsPath, …);
    await ExtractMdLinks(fileUri.fsPath, …);
}
</code>

Для каждого `.md` — **два** последовательных `fs.promises.readFile`. На проекте с 1000 `.md` — 2000 чтений файлов. Секунды на медленном диске.

Фикс — параллелить через `Promise.all`:

<code>
await Promise.all(mdFiles.map(async (fileUri) => {
    await ExtractFigures(fileUri.fsPath, …);
    await ExtractMdLinks(fileUri.fsPath, …);
}));
</code>

Но тогда порядок в `images[]` недетерминированный — придётся сортировать после. Сортировка уже есть (по `type`/`num`/`caption`), так что результат стабилен.

{% endcut %}
||
||
KI-183
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Нет `withProgress`
|
{% cut "Развернуть" %}

`collectAllImages` для 1000+ `.md` — секунды без индикатора. Пользователь видит «зависание». `showImagePicker` появляется только после полного обхода.

Фикс — `withProgress` вокруг `collectAllImages`:

<code>
let images = [];
await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Сбор изображений…' },
    async () => { images = await collectAllImages(rootDir); }
);
</code>

{% endcut %}
||
||
KI-184
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Кеш между вызовами отсутствует
|
{% cut "Развернуть" %}

Каждый вызов `pasteImageFromList` — полный обход `docs/`. Если пользователь вставляет несколько картинок подряд (копирует одну, потом другую) — каждый раз секунды ожидания.

Кеш можно было бы держать в `Map<rootDir, { images, timestamp }>` с TTL (например, 30 секунд) и инвалидировать по `onDidSaveTextDocument`/`onDidChangeTextDocument`. Не реализовано.

{% endcut %}
||
||
KI-185
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Нет `link.Copy`-совместимости
|
{% cut "Развернуть" %}

`image.PasteFromList` вставляет `![*caption*](relative)` — **не** создаёт JSON в буфере. То есть после вставки через `image.PasteFromList` пользователь **не может** использовать `link.Paste` для повторной вставки той же ссылки. Придётся снова открывать `pasteImageFromList` и искать в списке.

Дизайн: `image.PasteFromList` — «одноразовая» вставка, `link.Copy` — «сохранить в буфер для повторного использования». Разделение явное, но UX-несоответствие.

{% endcut %}
||
||
KI-186
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Сообщение об успехе — захардкожено на русском
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(`Вставлена ссылка: ${selectedImage.caption}`);
</code>

Не через NLS. В `en`-локали VS Code пользователь увидит русский текст. `link.*`/`image.PasteFromClipboard` используют `translate(…)` — здесь забыто.

{% endcut %}
||
||
KI-187
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`formatDetail` не локализован
|
{% cut "Развернуть" %}

<code>
const formatDetail = (img) => {
    return img.type === 'figure'
        ? `Figure • ${img.id}`
        : `Изображение • ${path.basename(img.targetPath)}`;
};
</code>

`Figure` — английское, `Изображение` — русское. В одной строке. Смешение языков.

{% endcut %}
||
||
KI-188
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`caption` для `figure` не очищается от markdown-форматирования
|
{% cut "Развернуть" %}

`extractFigcaptions` в `md.links.extract.js` вызывает `cleanCaption(match[2])`:

<code>
function cleanCaption(text) {
    text = text.replace(/\[([^4]]*)\]\([^5]*\)/g, '$1');   // [text](url) → text
    text = text.replace(/<a[^6]*>([^7]*)<\/a>/g, '$1');    // <a>text</a> → text
    text = text.replace(/<[^6]+>/g, '');                   // остальные теги — удалить
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}
</code>

Удаляет markdown-ссылки и HTML-теги, но **не** удаляет `*`, `_`, `**`. Если caption содержит `**важное**`, в `label` останется `**важное**`, а в финальной markdown-ссылке — `![***важное***]` — сломается.

{% endcut %}
||
||
KI-189
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Ссылка на `<figure>` идёт на `#id`, но id может быть невалидным
|
{% cut "Развернуть" %}

`figcaption` с `id="fig-…"` — по соглашению `buildFigureId`. Если пользователь создал `<figure>` вручную без `id` или с другим id (например, `id="my-figure"`), `ExtractFigures` найдёт, `image.id` = `'my-figure'`, ссылка будет `path#my-figure`. Работает, если `my-figure` уникален в документе. Если пользователь потом запустит `reindexer.figures` (которое переписывает `id` по шаблону `fig-<slug>`), старая ссылка сломается.

{% endcut %}
||
||
KI-190
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Файл `image.PasteFromList` использует `collectAllImages` из `figures`-экстрактора, но не `figures`-каталога
|
{% cut "Развернуть" %}

`ExtractFigures` (в `md.links.extract.js`) и `walkMdFilesGetFigures` (в `figures.collector.js`) — две разные реализации. Первая — для QuickPick, вторая — для генерации каталога. Разные структуры, разные поля.

Одна и та же подпись `<figcaption>` обрабатывается дважды (независимо). Если в `figures`-логике появится улучшение (например, извлечение `alt` из `![]()`), в `image.PasteFromList` оно не подхватится.

{% endcut %}
||
||
KI-191
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
`FindMdFiles` без `try/catch`
|
{% cut "Развернуть" %}

<code>
const mdFiles = await FindMdFiles(rootDir);
</code>

`vscode.workspace.findFiles` может бросить (например, если `rootDir` недоступен из-за прав). Исключение не поймано — VS Code покажет общую ошибку расширения.

{% endcut %}
||
||
KI-192
|
unknown
|
major
|
[`МодульВставкаизображенияизсписка`](../МодульВставкаизображенияизсписка/index.md)
|
Нет проверки, что `currentFilePath` внутри `rootDir`
|
{% cut "Развернуть" %}

Если пользователь открыл `.md` вне workspace (например, `File → Open File` на файл в `/tmp/test.md`), `currentFilePath` — `/tmp/test.md`, `rootDir` — `workspaceFolders[0]`. `getRelativeLink` вычислит `../../../../docs/ru/foo.md` (много `..`). Вставится ссылка за пределы проекта — `@diplodoc/cli` не соберёт.

Фикс — проверять `currentFilePath.startsWith(rootDir)`; если нет — предупредить.

{% endcut %}
||
||
KI-193
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
Критический баг `isImage = ext !== 'md'`
|
{% cut "Развернуть" %}

<code>
const ext = path.extname(targetFilePath);   // для 'foo.md' → '.md' (с точкой)
// …
isImage = ext !== 'md';                     // '.md' !== 'md' → true
</code>

`path.extname` возвращает расширение **с точкой**: `.md`, `.png`, `.yaml`. Сравнение с `'md'` (без точки) всегда даёт `true`. То есть `isImage = true` для **любого файла**.

Последствия:

1. **`.md`-файлы вставляются как `<figure>`** с `<figcaption>`, а не как `[text](url)`.
2. **Папки** обрабатываются корректно (`if (!isDirectory)` исключает папки из проверки `isImage`).
3. **Якоря не предлагаются** для `.md`-файлов — `if (!isImage)` пропускает их.

Симптом пользователя: скопировал `.md`, вставил — получил `<figure>` с картинкой-плейсхолдером и текстом вместо ссылки.

Фикс — одна строка:

<code>
isImage = ext !== '.md';
</code>

Или — использовать `data.isImage` из JSON (см. ниже).

{% endcut %}
||
||
KI-194
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`data.isImage` из JSON игнорируется
|
{% cut "Развернуть" %}

[`link.Copy`](../МодульКопированиессылки/index.md) кладёт `isImage` в JSON:

<code>
isImage: /\.(png&#124;jpe?g&#124;gif&#124;svg&#124;webp)$/i.test(fsPath),
</code>

`link.Paste` **не** читает его:

<code>
const { isDirectory, isImage } = await getFileTypeInfo(targetFilePath);
</code>

`getFileTypeInfo` пересчитывает `isImage` через `fs.stat` + `path.extname` (с багом выше). Данные из JSON теряются.

Правильный подход — доверять `data.isImage`, если он есть:

<code>
const { isDirectory } = await getFileTypeInfo(targetFilePath);
const isImage = (data.isImage !== undefined) ? data.isImage : await guessIsImage(targetFilePath);
</code>

Это устранило бы и баг выше — для `.md`-файлов `data.isImage === false`, и всё работало бы. Даже с багом `ext !== 'md'`, потому что JSON перекрыл бы `isImage`.

{% endcut %}
||
||
KI-195
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`fs.stat` при удалённом файле — тихая ошибка
|
{% cut "Развернуть" %}

Если целевой файл был удалён между `link.Copy` и `link.Paste`, `getFileTypeInfo`:

<code>
try {
    const stat = await fs.stat(targetFilePath);
    // …
} catch {
    if (!ext) isDirectory = true;
}
</code>

`catch` не сообщает о проблеме. `isDirectory = false`, `isImage = false` (по умолчанию) → идёт в markdown-ветку. `extractAnchorsFromMdFile` попробует прочитать файл — `[]`. Ссылка вставится **битой**, никакого сообщения.

Правильно — `throw` или `showWarningMessage('Целевой файл не найден: …')`.

{% endcut %}
||
||
KI-196
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
Дублирование `extractAnchorsFromMdFile`, `promptAnchorSelection`, `calculateRelativeMdPath`, `generateSlug`
|
{% cut "Развернуть" %}

Все четыре функции определены **и** в `link.Paste.js`, **и** в `link.utils.js`. Функционально идентичны, но:

- `link.Paste` использует свои копии;
- `link.utils` — используется линтером (`vscode.linter.links.picker.js`).

Реальное расхождение:

&#124; Функция                    &#124; `link.Paste`                            &#124; `link.utils`                       &#124;
&#124; -------------------------- &#124; --------------------------------------- &#124; ---------------------------------- &#124;
&#124; `promptAnchorSelection`    &#124; 1 аргумент, `translate(nls_ts…)` внутри &#124; 2 аргумента, `translateFn` передан &#124;
&#124; `calculateRelativeMdPath`  &#124; идентична                               &#124; идентична                          &#124;
&#124; `extractAnchorsFromMdFile` &#124; идентична                               &#124; идентична                          &#124;
&#124; `generateSlug`             &#124; идентична                               &#124; идентична                          &#124;

Если в одной из них появится баг или улучшение — вторая не узнает. Стоит вынести в один модуль (например, `link.utils`) и импортировать.

{% endcut %}
||
||
KI-197
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`isCursorInsideHtmlTag` — мёртвый код (~80 строк)
|
{% cut "Развернуть" %}

Функция определена в `link.Paste.js`, но **не вызывается**. `ux_link_paste` использует `getCursorContext(editor).isHtml` (stack-based парсер HTML).

`isCursorInsideHtmlTag` — наивная реализация (поиск `<` слева, `>` справа на текущей строке). Работает хуже, чем `getCursorContext.isHtml`. Удалить.

{% endcut %}
||
||
KI-198
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
HTML-ветка: `mdPath` без ведущего `/`
|
{% cut "Развернуть" %}

<code>
mdPath = segments.map(s => encodeURIComponent(s)).join('/');
</code>

Для страницы `docs/ru/foo/index.md`, ссылки на `docs/ru/bar/index.md` → `mdPath = 'ru/bar/index.html'` (без `/`).

В `buildDocumentLink` для HTML:

<code>
return `<a href="${mdPath}">${sourceLinkName}</a>`;
</code>

`href="ru/bar/index.html"` — **относительный** путь. Браузер будет искать `…/ru/foo/ru/bar/index.html`. Не найдёт.

Правильно — `/${mdPath}` или полный URL (`https://docs.example.com/ru/bar/index.html`).

Но возможно, автор подразумевал, что HTML-блок будет в `build/`-корне (например, `<iframe>`), где относительно корня — ок. Это зависит от контекста. Отмечаю как «потенциальный баг».

{% endcut %}
||
||
KI-199
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
Вставка внутри существующей markdown-ссылки не отсекается
|
{% cut "Развернуть" %}

`link.Paste` не проверяет `isInsideMarkdownLink` (в отличие от `link.addAnchor`). Если пользователь внутри `[existing](url)` вызовет `link.Paste` без выделения — получит `[existing]([new](url2))` — сломанный markdown. Или с выделением `existing` — `[existing]([new](url2))`.

Правильно — добавить проверку `isInsideMarkdownLink` (как в `link.addAnchor`) и предупредить.

{% endcut %}
||
||
KI-200
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`promptAnchorSelection` не находит `{@anchor}`
|
{% cut "Развернуть" %}

`extractAnchorsFromMdFile` ищет:

- markdown-заголовки (`## …`);
- `id="…"` (regex);
- `<a name="…">` (regex).

**Не находит**:

- `{@anchor name="…"}` — YFM-разметка;
- `<a id="…">` — старая разметка (только `name=` ищется);
- заголовки без `{}` (авто-слаг из `## Введение` → `#vvedenie`) — **находит** через `generateSlug`.

{% endcut %}
||
||
KI-201
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`getTargetMdFile` для папок без `index.md`
|
{% cut "Развернуть" %}

<code>
function getTargetMdFile(targetFilePath, isDirectory) {
    if (isDirectory) {
        return path.join(targetFilePath, INDEX_MD);
    }
    // …
}
</code>

Не проверяет `fs.existsSync`. Если папка без `index.md` (например, `docs/ru/images/`), вернёт `docs/ru/images/index.md`. `extractAnchorsFromMdFile` попробует прочитать — `catch`, `[]`. Якоря не предлагаются.

{% endcut %}
||
||
KI-202
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

Как и в остальных `link.*`/`section.*`. `if (!editor) return;` — если команда вызвана из палитры без активного редактора. Но `when` (`editorTextFocus`) это блокирует.

{% endcut %}
||
||
KI-203
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`encodeURIComponent` — потеря читаемости при отладке
|
{% cut "Развернуть" %}

Кириллица кодируется: `Раздел1.Введение` → `%D0%A0%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB1.%D0%92%D0%B2%D0%B5%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5`. Работает (Diplodoc сам декодирует), но при ручной отладке ссылки в `.md` — нечитаемы.

{% endcut %}
||
||
KI-204
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`listIndent` для выделения не применяется
|
{% cut "Развернуть" %}

Если у пользователя есть выделение **внутри списка**, `hasSelection = true` → `editor.edit` вызывает `replace(selectionRange, linkText)` без indent. Если пользователь выделил пустой текст (несколько пробелов) — indent не нужен, всё ок. Если выделил реальный текст — replace заменяет его ссылкой на тех же позициях, indent не нужен.

Но если пользователь вставляет **без выделения** внутри списка — `insert` с indent. Если выделение **пустое**, но есть `listIndent > 0` — тоже indent. Логика согласована.

{% endcut %}
||
||
KI-205
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`workspaceRoot` — берётся первая папка
|
{% cut "Развернуть" %}

<code>
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
</code>

В мульти-workspace (несколько папок открыто в VS Code) — берётся **первая**, не та, где находится `sourceFilePath`. Результат `relativeFromRoot` может быть неверным.

Правильно — найти папку-workspace, содержащую `sourceFilePath`:

<code>
const workspaceRoot = vscode.workspace.workspaceFolders
    ?.find(f => sourceFilePath.startsWith(f.uri.fsPath))
    ?.uri.fsPath;
</code>

{% endcut %}
||
||
KI-206
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`linkName` с `]` ломает markdown
|
{% cut "Развернуть" %}

Если `linkName` (из `sourceLinkName` в JSON) содержит `]` (например, `pureTitle: "Формула [E=mc²]"`), в markdown-ссылке `[Формула [E=mc²]](url)` — сломается. `link.Copy` не очищает `]` из `pureTitle`.

{% endcut %}
||
||
KI-207
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
Параметр `index` в `indentMultilinedText` не используется
|
{% cut "Развернуть" %}

<code>
.map((line, index) => { … })
</code>

`index` не используется внутри. Минорный warning ESLint. Не критично.

{% endcut %}
||
||
KI-208
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`error.emptybuffer` — недостижим в норме
|
{% cut "Развернуть" %}

<code>
if (data === null &#124;&#124; !data.sourceLinkPath &#124;&#124; !data.sourceLinkName) {
    throw new Error(translate('plugin.link.paste.error.emptybuffer'));
}
</code>

В `when` (`canPasteMarkdownLink`) проверяется `parseClipboardLink(clipboardText) !== null`. То есть если буфер не JSON, команда не видна. Значит `data === null` в норме недостижимо.

Но: `parseClipboardLink` возвращает `null` только при `JSON.parse`-исключении. Если JSON — `{}` (без полей), `parseClipboardLink` вернёт `{}` (не `null`), `canPasteMarkdownLink` вернёт `true` (объект ≠ null), команда будет видна. При вставке `ConvertDocumentPathToLink` упадёт на `!data.sourceLinkPath` → `error.emptybuffer`.

То есть проверка нужна, но сообщение «буфер пуст» неточное — правильнее «в буфере не Diplodoc-ссылка».

{% endcut %}
||
||
KI-209
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
Нет подтверждения при перезаписи
|
{% cut "Развернуть" %}

Если пользователь выделил текст и вставил ссылку — выделение заменится безвозвратно. `Ctrl+Z` вернёт. Но никакого «вы уверены?» — стандартное поведение редактора, не баг.

{% endcut %}
||
||
KI-210
|
unknown
|
major
|
[`МодульВставкассылки`](../МодульВставкассылки/index.md)
|
`sourceLinkPath` может быть относительным
|
{% cut "Развернуть" %}

`link.Copy` пишет абсолютный путь (`uri.fsPath`), но если пользователь вручную скопировал JSON с относительным путём (или с путём из другой ОС — `C:\…` на Linux), `fs.stat` бросит, `getFileTypeInfo` → `isDirectory = false`, `isImage = false`. Ссылка вставится с неверным путём.

Никакой валидации формата `sourceLinkPath` нет.

{% endcut %}
||
||
KI-211
|
unknown
|
major
|
[`МодульГОСТы`](../МодульГОСТы/index.md)
|
Markdown-ссылки в карточках рендерятся как текст
|
{% cut "Развернуть" %}

`resolveMarkdownLinks` в `gosts.injector.js` переписывает URL (`.md` → `.html`, абсолютизирует), но оставляет markdown-синтаксис: `[text](url)`. Клиент (`gosts.js`) экранирует поля через `esc()`, который не трогает `[]()`. В итоге в карточке виден литерал `[text](/ru/foo.html)`, а не гиперссылка.

**Решение (в бэклоге):** добавить в клиент функцию `renderRichText`, которая экранирует HTML, а затем превращает `[text](url)` в `<a href>` — с проверкой схемы (`javascript:`, `vbscript:`, `data:` — блокировать) и добавлением `target="_blank" rel="noopener"` для внешних URL.

{% endcut %}
||
||
KI-213
|
unknown
|
major
|
[`МодульГОСТы`](../МодульГОСТы/index.md)
|
`resolveMarkdownLinks` не обрабатывает абсолютные `.md`
|
{% cut "Развернуть" %}

Условие `if (mdPath.startsWith('http') &#124;&#124; mdPath.startsWith('/')) return match;` пропускает ссылки от корня сайта: `[text](/ru/foo/bar.md)` останется с `.md`. Лечится отдельной веткой:

<code>
if (mdPath.startsWith('/')) {
    return `[${linkText}](${mdPath.replace(/\.md$/, '.html')}${hash &#124;&#124; ''})`;
}
</code>

{% endcut %}
||
||
KI-214
|
unknown
|
major
|
[`МодульГОСТы`](../МодульГОСТы/index.md)
|
Клиентский скрипт копируется из `__dirname`
|
{% cut "Развернуть" %}

`gosts.injector.js` вызывает `fs.copyFileSync(path.join(__dirname, 'gosts.js'), ...)`. В исходниках клиентский скрипт лежит в `client/_assets/scripts/gosts.js`, а `gosts.js` в корне модуля — это Node-модуль генератора. Если в целевом артефакте (`dist/` или `plugins/`) `gosts.js` не подменён клиентской версией на этапе сборки — в браузер попадёт Node-код, таблица не отрисуется. Проверить, что копирование идёт из правильного источника.

{% endcut %}
||
||
KI-215
|
unknown
|
major
|
[`МодульГОСТы`](../МодульГОСТы/index.md)
|
Ссылка на раздел — по имени папки
|
{% cut "Развернуть" %}

`findSectionIndexHtml` ищет папку по имени без учёта регистра, но `--section` должен совпадать с реальным именем папки (`ГОСТы`, а не `GOSTs`). Ошибка не диагностируется — просто `process.exitCode = 1` с сообщением «HTML файл не найден».

{% endcut %}
||
||
KI-216
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`validateInput` и `slugify_latin_alphanumeric` — разный набор символов
|
{% cut "Развернуть" %}

`validateInput` разрешает `[a-zA-Z0-9а-яА-Я\-_]` (буквы лат.+кир., цифры, дефис, подчёркивание). `slugify_latin_alphanumeric` дефис (`-`) **не сохраняет** — заменяет на `_`.

Практический эффект:

- пользователь вводит `formula-rascheta`, видит валидный ввод;
- получает `id='formula_rascheta'` (с подчёркиванием, а не дефисом).

В `placeHolder` подсказка — `«например, moj-yakor»` (с дефисом). Пользователь введёт `moj-yakor`, получит `moj_yakor`. Если он потом ищет в файле по `id='moj-yakor'` — не найдёт.

Правильно — либо разрешить `-` в `slugify_latin_alphanumeric` (сейчас `[^11]+` заменяет всё, включая `-`), либо убрать `-` из `validateInput` и поменять `placeHolder` на `«например, moj_yakor»`.

{% endcut %}
||
||
KI-217
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` — эвристика, ложно срабатывает на математике
|
{% cut "Развернуть" %}

`x < y > z` — `isInsideHtmlTag` вернёт `true`, потому что между `<` и `>`. Пользователь не сможет добавить якорь на выделение `y` в математическом выражении.

Аналогично для `-->` (стрелка в комментариях, стрелки в тексте), `<= … >=` (сравнения в примерах кода).

Правильная проверка — парсер HTML или проверка, что `<` — начало тега (`</?[a-z]+`), а не оператор. Сейчас — простая эвристика.

{% endcut %}
||
||
KI-218
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideMarkdownLink` — только inline-формат
|
{% cut "Развернуть" %}

Не находит reference-style ссылки:

<code>
[text][ref]
[ref]: url
</code>

Выделение `text` в `[text][ref]` — `isInsideMarkdownLink` вернёт `false` (после `]` стоит `[`, не `(`). Модуль разрешит обернуть `text` в `<div>`, ссылка сломается.

Также не находит `<a href="…">text</a>` (это HTML, но `isInsideHtmlTag` тоже не сработает, если выделение в `text` — там нет `<` слева от `text`).

{% endcut %}
||
||
KI-219
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`editor.edit` без проверки результата
|
{% cut "Развернуть" %}

<code>
await editor.edit(editBuilder => { … });
</code>

Возвращает `Promise<boolean>` — `true`, если изменение применилось. Модуль игнорирует. Если `editor.edit` вернёт `false` (документ readonly, например), пользователь не увидит ошибки — выделение останется как есть, но сообщения об успехе тоже нет. Молчаливый «ничего не произошло».

Правильно:

<code>
const ok = await editor.edit(…);
if (!ok) vscode.window.showErrorMessage('Не удалось изменить документ');
</code>

{% endcut %}
||
||
KI-220
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Одинарные кавычки в атрибутах
|
{% cut "Развернуть" %}

</code>html
<div id='formula' class='diplodocanchor'>
</code>

HTML валиден, Diplodoc/YFM рендерит. Но в `.md` принято использовать двойные кавычки (по аналогии с `<figcaption class="imageDescription" id="fig-…">Рисунок 3. ` в `figures`).

Не баг, но стилистическое несоответствие с остальной документацией.

{% endcut %}
||
||
KI-221
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Класс `diplodocanchor` — стилизация?
|
{% cut "Развернуть" %}

Класс `diplodocanchor` используется темой для стилизации (например, пунктирное подчёркивание). В исходниках расширения нет `.css`-файла, который определяет стиль этого класса — он, вероятно, определён в теме Diplodoc (в `_assets/styles/` или в CSS самого Diplodoc).

Если тема не поддерживает `.diplodocanchor` — `<div>` выглядит как обычный блок, но всё равно работает как якорь (id — главное). Если пользователь запускает проект без темы Diplodoc — стилизации нет, но ссылки на `#my-anchor` работают.

Проверить, определён ли класс в теме, можно через DevTools: `getComputedStyle(document.querySelector('.diplodocanchor'))`.

{% endcut %}
||
||
KI-222
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`isInsideHtmlTag` / `isInsideMarkdownLink` — только на текущей строке
|
{% cut "Развернуть" %}

Обе функции читают `document.lineAt(startPos.line).text` — **одну строку**. Если выделение начинается на одной строке, а `[` — на предыдущей (например, многострочная ссылка — редкость, но возможно), проверка не сработает.

Многострочные `<div>` тоже: если выделение на второй строке внутри `<div>\n…\n</div>`, `isInsideHtmlTag` ищет `<` и `>` **внутри текущей строки** — не найдёт, разрешит вставку якоря. Получится вложенный `<div>` — Diplodoc отрендерит, но это не то, что задумано.

{% endcut %}
||
||
KI-223
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Транслитерация теряет смысл в некоторых языках
|
{% cut "Развернуть" %}

`diplodocTransliterate` поддерживает только кириллицу (`а`→`a`, `б`→`b`, …, `я`→`ya`). Для армянского, греческого, арабского — символы не транслитерируются, а идут в `[^11]+` → `_`. Пользователь с греческим именем якоря (`αλφα`) получит `''` (после схлопывания `_` и трима) — ошибка `invalidId`.

Для расширения, заточенного под русскоязычную документацию, это нормально. Но если проект мультиязычный (например, есть армянская документация), `addAnchor` там не работает.

{% endcut %}
||
||
KI-224
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`promptForAnchorId` — валидация без проверки на занятость
|
{% cut "Развернуть" %}

`validateInput` проверяет только формат. Если пользователь вводит `id`, который **уже есть** в текущем документе (например, `formula` уже использован для другой формулы), модуль **не** предупредит. Создастся второй `<div id='formula'>…</div>` — в HTML это невалидно (id должен быть уникальным), в браузере `#formula` откроет первый.

Правильно — `extractAnchorsFromMdFile` (из `link.utils`) и проверка `seenAnchors.has(sanitizedId)`. Но `link.addAnchor` его не вызывает.

{% endcut %}
||
||
KI-225
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Усечённая поддержка `-` в `id`
|
{% cut "Развернуть" %}

HTML5 разрешает `-` в `id`. `slugify_latin_alphanumeric` его убирает. Это ограничение транслита — но `id` мог бы содержать `-`, если бы `slugify` не заменял всё на `_`.

Практически: пользователь не может создать якорь с дефисом. Если в проекте уже есть якоря с `-` (например, созданные вручную или другим инструментом), `addAnchor` их не перезапишет — новый якорь с `_` будет рядом.

{% endcut %}
||
||
KI-226
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`wrappedText` не экранирует `selectedText`
|
{% cut "Развернуть" %}

<code>
const wrappedText = `<div id='${sanitizedId}' class='diplodocanchor'>${selectedText}</div>`;
</code>

`selectedText` вставляется как есть. Если пользователь выделил `<script>alert(1)</script>`, оно попадёт в `.md`. При сборке `@diplodoc/cli` отрендерит как HTML (inline). Это **XSS-вектор** для автора документации, но не для читателя (он читает, что автор написал). В контексте технической документации — не проблема: автор сам решает, что вставлять.

Тем не менее, если пользователь случайно выделил HTML-тег (например, `<figcaption>`) и применил `addAnchor` — получит `<div><figcaption>…</figcaption></div>`. Работает, но вложенность может ломать CSS.

{% endcut %}
||
||
KI-227
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Отсутствие отмены
|
{% cut "Развернуть" %}

`editor.edit` — атомарная операция. Если пользователь передумал — только `Ctrl+Z`. Никакого «предпросмотра» нет.

{% endcut %}
||
||
KI-228
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
Порядок проверок не оптимален
|
{% cut "Развернуть" %}

`isInsideMarkdownLink` выполняется **после** `isInsideHtmlTag`. Обе читают одну строку, но в разном порядке. Логически можно было бы объединить в одну функцию, но текущее разделение — на два независимых кейса с одним сообщением об ошибке.

{% endcut %}
||
||
KI-229
|
unknown
|
major
|
[`МодульДобавлениеякоря`](../МодульДобавлениеякоря/index.md)
|
`error.invalidContext` — общее сообщение для двух случаев
|
{% cut "Развернуть" %}

Одна ошибка `«Нельзя добавить якорь внутри HTML-тега или Markdown-ссылки»` — для двух разных случаев (HTML vs markdown). Пользователь не знает, какая именно проблема. Можно было бы разделить на два сообщения, но не критично.

{% endcut %}
||
||
KI-231
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
PlantUML требует `java` — не везде есть
|
{% cut "Развернуть" %}

`checkEnvironment`:

- если `PLANTUML_JAR_PATH` в env — OK;
- `execSync('java -version')` — OK;
- `execSync('plantuml -version')` — OK;
- иначе — `console.error` и **возврат строки-заглушки** `«*Ошибка сборки диаграммы…*»` (вместо генерации).

Если пользователь без `java`, но с Mermaid-движком (по CLI) — PlantUML **не вызывается**, всё работает. Если пользователь переключил `CURRENT_ENGINE = PLANTUML` в коде — упадёт без `java`. Диагностика в `console.error`, не в UI. Пользователь увидит «Ошибка сборки диаграммы» в готовой странице.

{% endcut %}
||
||
KI-232
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`plantuml.jar` ищется в трёх местах
|
{% cut "Развернуть" %}

<code>
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
</code>

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

{% endcut %}
||
||
KI-234
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`cleanupRoadmapPages` — тихая очистка при ошибке
|
{% cut "Развернуть" %}

<code>
if (!data) {
    cleanupRoadmapPages(docsRoot);
    return;
}
</code>

Если данные невалидны (JSON-парсинг бросил), `runGeneration` вызывает `cleanupRoadmapPages` — перезаписывает `roadmap/index.md` на «*Данные временно недоступны.*». Пользователь запустил сборку, ожидал увидеть диаграмму, видит заглушку. `console.error` в логах, но если запуск через `docs-build.js` — лог может потеряться среди шагов.

{% endcut %}
||
||
KI-235
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`task.url` — не `task.href` и не `task.link`
|
{% cut "Развернуть" %}

В `roadmap-data.json` поле URL называется `url`. В `prepareRoadmapData`:

<code>
if (task.url) mapping[task.id] = task.url;
</code>

В `generateTableCompact` URL **не** используется — таблица показывает только `name`, `start`, `end`, `deps`. То есть если в данных `url` есть, он попадает только в `mapping` (для диаграммы), а в таблице — обычный текст, не ссылка.

См. `table.generator.js`:

<code>
const funcLabel = func.url ? `[${func.name}](func.url)` : `${func.name}`;
</code>

Стоп — `url` в `mapping` для диаграммы, но в таблице — **литерал** `(func.url)` (не подставляется). Баг:

- `[${func.name}](func.url)` — в markdown это ссылка `[текст](func.url)`, где `func.url` — буквальная строка `func.url`, а не значение поля. Ссылка ведёт на `func.url` — несуществующий путь.
- Аналогично для `module`: `const moduleLabel = module.url ? \`[${module.name}](module.url)\` : …`.

То есть если у модуля или функции есть `url`, в таблице ссылка **сломана** (ведёт на `module.url` / `func.url`). Если нет — просто текст.

{% endcut %}
||
||
KI-236
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`prepareRoadmapData` и `generateTableCompact` дублируют группировку
|
{% cut "Развернуть" %}

Обе функции строят `groups` + `modules` независимо:

- `prepareRoadmapData` — для диаграммы (с `mapping`);
- `generateTableCompact` — для таблицы (с `&nbsp;`-отступами).

Две реализации одной логики. Если в `prepareRoadmapData` добавят обработку «сирот» (например, `task.dependencies` без `module`), в `generateTableCompact` этого не будет.

{% endcut %}
||
||
KI-237
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`start`/`end` — только `MM-YYYY`
|
{% cut "Развернуть" %}

`parseDateToNumber(dateStr)`:

<code>
const parts = dateStr.split('-');
if (parts.length !== 2) return 0;
const month = parts[0].padStart(2, '0');
const year = parts[1];
return parseInt(`${year}${month}`, 10);
</code>

Ожидает `MM-YYYY` (например, `01-2024`). Если пользователь напишет `2024-01` (ISO-формат) — `parts[0]` = `2024`, `parts[1]` = `01` — `month = '2024'`, `year = '01'` — `parseInt('012024')` = `12024`. Некорректная сортировка.

`generateMermaidScript` использует `dateFormat MM-YYYY` — тоже ожидает этот формат. `plantuml.script.builder` — `[startMonth, startYear] = task.start.split('-')` — тоже ожидает `MM-YYYY`.

Формат **жёстко** `MM-YYYY`. Если пользователь ошибётся — диаграмма отрендерится с неверными датами (например, `2024` как месяц → PlantUML/Mermaid не смогут распарсить и покажут ошибку в диаграмме).

{% endcut %}
||
||
KI-238
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`plantuml.svg.builder` использует `exec` с конкатенацией
|
{% cut "Развернуть" %}

<code>
const command = getPlantUmlCommand(tempPumlPath, targetDir);
exec(command, callback);
</code>

`exec` использует shell. `tempPumlPath` и `targetDir` подставляются в строку. Если путь содержит пробелы (`C:\Program Files\…`) — `exec` разобьёт на аргументы. В коде пути обёрнуты в `"…"`, но если в пути есть `"` или `;` — инъекция. Практически: `exec` для jar-пути приемлем (пути контролирует пользователь), но **не** безопасно для авто-генерируемых путей.

{% endcut %}
||
||
KI-239
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`outputDir` в `buildPlantUml` — это `outputDir` из `runGeneration`
|
{% cut "Развернуть" %}

<code>
const outputDir = path.join(langDir, 'roadmap');
</code>

`buildPlantUml(data, lang, outputDir, ROADMAP_CSS)`:

<code>
const { svgAbsolutePath } = getPlantUmlImagePath(outputDir, lang);
// outputDir/images/gantt_<lang>.svg
</code>

То есть SVG сохраняется в `docs/<lang>/roadmap/images/`. При сборке `@diplodoc/cli` эта папка попадёт в `build/<lang>/roadmap/images/`. Ссылка из markdown на SVG — **абсолютный** путь через `README`? Проверить:

- `wrapSvgContainer` вставляет `svgContent` **inline** (не `![](…)`), SVG-контент целиком внутри HTML;

Значит `buildPlantUml` возвращает **inline SVG**. А `svgAbsolutePath` — куда записывается файл — **не** используется в markdown (только как промежуточный). Это может быть проблемой: если пользователь откроет `build/<lang>/roadmap/index.html` — SVG уже inline, всё ок. Но сам SVG-файл в `roadmap/images/` «висит» (не referenced). Это не баг (просто лишний файл), но при `cleanupRoadmapPages` его удаляют.

{% endcut %}
||
||
KI-240
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`cleanupRoadmapPages` — удаляет `gantt_<lang>.svg`, но не `gantt_<lang>.puml`
|
{% cut "Развернуть" %}

Если `renderPlantUmlToSvg` упадёт **до** удаления `.puml` (например, `error` в `exec`), то `.puml` останется в `roadmap/images/`. `cleanupRoadmapPages` его не трогает (только `.svg`). Мусор накапливается.

{% endcut %}
||
||
KI-241
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`roadmap.patcher` — не часть `roadmap`
|
{% cut "Развернуть" %}

`patcher` (см. следующую статью `4.2-033`) вызывается отдельным шагом `ganttFixScroll` в `post`-фазе. `roadmap` **не** знает о `patcher` и не проверяет, что он отработал. Если `--skip=ganttFixScroll` — диаграмма рендерится, но не интерактивна.

{% endcut %}
||
||
KI-242
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`lang: 'ru' &#124; 'en'` захардкожено
|
{% cut "Развернуть" %}

<code>
const languages = fs.readdirSync(docsRoot).filter(dir => {
    return fs.statSync(fullPath).isDirectory() && (dir === 'ru' &#124;&#124; dir === 'en');
});
</code>

Только `ru` и `en`. Если пользователь добавил `de` — `roadmap` для `de` не генерируется. Пользователь увидит `/de/roadmap/` — 404.

{% endcut %}
||
||
KI-243
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`svg` читается целиком в память
|
{% cut "Развернуть" %}

<code>
let svgContent = fs.readFileSync(renderPath, 'utf-8');
</code>

PlantUML-Gantt для большого проекта (50+ задач) — мегабайты. `fs.readFileSync` + `wrapSvgContainer` + `fs.writeFileSync` — всё в памяти. Для типичного проекта — ок, для крупного — потенциально медленно.

{% endcut %}
||
||
KI-244
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`buildMermaidSvg` — заглушка
|
{% cut "Развернуть" %}

<code>
async function buildMermaidSvg() {
    return { svgContent: null, isClientRendered: true };
}
</code>

Функция **не используется** нигде. При `MERMAID`-движке `buildMermaid` не вызывает `buildMermaidSvg` — она возвращает `wrapMermaidContainer(script, …)` с markdown-блоком ` </code>mermaid `, а `@diplodoc/cli` (клиентский Mermaid) отрендерит его в браузере. `buildMermaidSvg` — мёртвый код (или задел на будущее — серверный рендер Mermaid через `mermaid-cli`).

{% endcut %}
||
||
KI-245
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`mappingJson` в Mermaid-ветке содержит пустую строку при отсутствии mapping
|
{% cut "Развернуть" %}

<code>
const mappingJson = Object.keys(mapping).length > 0 ? JSON.stringify(mapping) : null;
</code>

Если `mapping` пуст (у пользователя нет `url` в данных) — `mappingJson = null`, в `wrapMermaidContainer` `mappingBlock = ''` (пустая строка). `patcher` (для Mermaid) проверит `if (!rawMapping) return;` — клики по узлам не работают. Ожидаемое поведение, но не документировано.

{% endcut %}
||
||
KI-246
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`console.log('[${lang}] Roadmap создан (${engine}): ${indexPath}')`
|
{% cut "Развернуть" %}

Выводит `engine` — но фактический движок может отличаться от `CURRENT_ENGINE`, если вызов был через CLI с `MERMAID`. В логе — `engine` из `options` (или `CURRENT_ENGINE`). Совпадает с реальным, но константа `CURRENT_ENGINE` создаёт путаницу.

{% endcut %}
||
||
KI-247
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`roadmap` не создаёт `toc.yaml` для папки `roadmap/`
|
{% cut "Развернуть" %}

`runGeneration` пишет только `index.md`. `toc.yaml` и `index.yaml` — **не** пишутся. Пользователь должен сам добавить запись в `toc.yaml` родителя (например, `Дополнительнаяинформация/toc.yaml`) — иначе в навигации `roadmap/` не появится.

Сравни с `abbrs`/`terms`/`gosts`/`figures`/`helptags`/`contexts` — все пишут `toc.yaml` + `index.yaml` + `index.md`. `roadmap` — только `index.md`. Несогласованность.

Практический эффект: пользователь запустил `docs-build.js`, ожидал, что раздел «Планы» появится в навигации — не появился. Надо вручную добавлять.

{% endcut %}
||
||
KI-248
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`roadmap` не идемпотентен по `mapping`
|
{% cut "Развернуть" %}

`mapping` (id → url) собирается **только** из `tasks` (функции). У групп и модулей `url` **не** попадает в `mapping`. То есть клик по milestone (группа) в PlantUML — не работает. Клик по задаче (функция) — работает.

В `generateMermaidScript` — то же: `mapping[milestoneId] = groupObj.url` (для групп) — **есть**! Расхождение между PlantUML- и Mermaid-ветками:

- **PlantUML**: `[${milestoneLabel}] links to [[${groupObj.url} ${milestoneLabel}]]` — ссылка встроена в `[[…]]`-синтаксис;
- **Mermaid**: `mapping[milestoneId] = groupObj.url` — ссылка в `mapping`-JSON, а `patcher` навешивает клик.

Оба работают, но **по-разному**. В PlantUML — родная ссылка (`links to`), в Mermaid — патчер.

{% endcut %}
||
||
KI-249
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`generateMermaidScript` — `deps` фильтр
|
{% cut "Развернуть" %}

<code>
const deps = task.dependencies.filter(id => {
    const depItem = data.find(d => d.id === id);
    return depItem && depItem.type === 'function';
});
let afterPart = deps.length > 0 ? `, after ${deps.join(' ')}` : '';
</code>

`dependencies` задачи (`function`) содержит `[moduleId, ...functionDeps]`. Фильтр оставляет только `functionDeps` (не `moduleId`). Правильно: `after` в Mermaid — только для межфункциональных зависимостей, а не для «принадлежит модулю».

Но если `functionDeps` ссылается на `task.id`, который **не** в `tasks` (например, удалён), Mermaid упадёт с «unknown task». Диагностики нет.

{% endcut %}
||
||
KI-250
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`data.find(d => d.id === id)` — O(n) на каждую зависимость
|
{% cut "Развернуть" %}

В `generateMermaidScript`:

<code>
const depItem = data.find(d => d.id === id);
</code>

В цикле по `taskList.forEach`. Для 50 задач × 5 зависимостей = 250 × `find` по `data` (1000 записей) = 250 000 операций. Работает, но можно было бы построить `dataById`-карту один раз.

{% endcut %}
||
||
KI-251
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`lang` в `roadmap-data.json` не учитывается
|
{% cut "Развернуть" %}

Один и тот же `roadmap-data.json` используется для `ru` и `en`. `title`, `name`, `start`, `end` — **одни и те же**. Нет поля `name_ru`/`name_en` или `locale`.

Практический эффект: `en`-дорожная карта содержит русские названия. Для расширения, заточенного под русскоязычную документацию, — нормально. Но если пользователь добавит `en`, придётся делать **два** `roadmap-data.json` и передавать разные `--dataPath` — что не поддерживается CLI (один `--dataPath`).

{% endcut %}
||
||
KI-252
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
`roadmap` не в `module.exports` файла CLI
|
{% cut "Развернуть" %}

<code>
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
</code>

`generateRoadMap` **отсутствует** в `module.exports`. Как и `helptags` — CLI-команда работает, но программно импортировать нельзя. Для внешних интеграций — неудобно.

{% endcut %}
||
||
KI-253
|
unknown
|
major
|
[`МодульДорожнаякарта`](../МодульДорожнаякарта/index.md)
|
PlantUML-диаграмма **не** регенерируется при повторной сборке без данных
|
{% cut "Развернуть" %}

Если пользователь запускает `docs-build.js` второй раз, `roadmap` пытается перегенерировать SVG. `renderPlantUmlToSvg` **не** проверяет `fs.existsSync(dataPath)` — перезаписывает всегда. Для `plantuml` это нормально. Но `svgAbsolutePath` может существовать «старым» (от предыдущей сборки) — если `exec` упадёт, пользователь увидит старую диаграмму (или ошибку в ней).

`cleanupRoadmapPages` вызывается **только** если `data = null`. Если данные есть, но `exec` упал — `renderPlantUmlToSvg` бросит, `buildPlantUml` вернёт строку-заглушку `«*Ошибка сборки диаграммы…*»`, `runGeneration` запишет её в `index.md`. `cleanupRoadmapPages` **не** вызывается (данные были).

То есть при ошибке рендера пользователь видит в статье строку-заглушку вместо диаграммы, но `roadmap/index.md` перезаписан. При следующей сборке — попробует снова.

{% endcut %}
||
||
KI-254
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
Переключатель list/grid и лайтбокс не работают из коробки
|
{% cut "Развернуть" %}

`writeFigureList` генерирует:

</code>html
<div class="figures-view-switch" role="tablist">
  <button type="button" data-figures-view="list" aria-pressed="true">Список</button>
  <button type="button" data-figures-view="grid" aria-pressed="false">Сетка</button>
</div>
<div class="figures-container" data-view="list">
  <table class="figures-table">…</table>
  <div class="figures-grid">…</div>
</div>
</code>

Но **никакого клиентского скрипта модуль не инжектит**: `data-figures-view` / `data-view` никто не слушает. Переключатель визуально присутствует, но не работает, пока тема (или `_assets/scripts/`) не подгрузит соответствующий скрипт. То же с `js-lightbox-trigger` на `<img>` — лайтбокса в модуле нет.

Починка: либо инжектить небольшой inline-скрипт (по аналогии с `abbrs.client` / `terms.client`), либо задокументировать требование к теме.

{% endcut %}
||
||
KI-255
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
Модуль `async`, но вызывается синхронно
|
{% cut "Развернуть" %}

`runGeneration` в `figures.js` — `async`. В CLI (`diplodoc-helper-cli.js`) вызов синхронный:

<code>
} else if (command === 'createFigureContent') {
    generateFigures(docsDir);  // Promise, никто не ждёт
}
</code>

В Node это «работает по счастливой случайности»: pending `sharp`-операции держат event loop открытым, поэтому процесс не выходит, пока превью не готовы. Но ошибки внутри `runGeneration` (кроме тех, что пойманы `try/catch`) не всплывут наружу — `process.exitCode` останется `0`.

Правильно: `await generateFigures(docsDir)` (и делать сам `diplodoc-helper-cli.js` async, или `.then()` с установкой `process.exitCode`).

{% endcut %}
||
||
KI-256
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
`sharp` — нативная зависимость
|
{% cut "Развернуть" %}

`src/plugins/figures/figures.js` требует `sharp` в начале файла. Это нативный модуль (C++/libvips, ~20 МБ). Для standalone-поставки `figures` придётся тянуть `sharp` — сложности с кросс-платформенной сборкой. У `gosts`, `abbrs`, `terms` этой проблемы нет (pure JS).

Если `sharp` не установлен (или не собрался под текущую платформу), модуль упадёт при `require('sharp')` ещё до того, как CLI успеет что-то сделать.

{% endcut %}
||
||
KI-257
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
Превью не обновляются, если изменилось изображение
|
{% cut "Развернуть" %}

`createThumbnail` пропускает файл, если `<thumbPath>` уже существует:

<code>
if (fs.existsSync(extThumbPath)) return;
</code>

Имя — `<baseName>_<md5(путь)>.webp`. Хеш от **пути**, не от содержимого. Значит:

- переименовали файл → новое имя превью, старое останется мусором;
- изменили картинку без переименования → превью не перегенерируется;
- удалили `.md` — запись пропадёт из индекса, превью останется.

Очистки `figures/thumbs/` от «сирот» нет.

{% endcut %}
||
||
KI-258
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
`<figcaption>` — только двойные кавычки, одна строка
|
{% cut "Развернуть" %}

Регулярка в extractor:

</code>
/<figcaption\s+class="imageDescription"([^13]*?)\sid="([^14]+)"([^13]*?)>([\s\S]*?)<\/figcaption>/gi
</code>

Требует именно `class="..."` с двойными кавычками. Одинарные не сработают. Также `<figcaption>` должен быть на одной строке (`[^13]*?` не проглатывает `\n` перед `>`).

{% endcut %}
||
||
KI-259
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
Изображение ищется «слева и ближе всех»
|
{% cut "Развернуть" %}

`extractFiguresFromFile` берёт **ближайшее** markdown-изображение, находящееся **до** `<figcaption>`:

<code>
if (img.pos < pos && pos - img.pos < bestDist) { … }
</code>

Два изображения подряд и один `<figcaption>` — привяжется к ближайшему. `<figcaption>` без предшествующего изображения — `imagePath` = `null` (в таблицу попадёт `—`). Изображение **после** `<figcaption>` — не найдётся.

{% endcut %}
||
||
KI-260
|
unknown
|
major
|
[`МодульИллюстрации`](../МодульИллюстрации/index.md)
|
Относительные пути только от директории `.md`
|
{% cut "Развернуть" %}

`imagePath` резолвится относительно `path.dirname(fig.sourcePath)`. `<img src>` от корня сайта (`/ru/foo/bar.png`) не резолвится — файл не найдётся, превью не создастся, но запись в каталоге будет с `—`.

`!/^(https?:&#124;data:&#124;\/\/)/i.test(raw)` не отсеивает `file://` и `ftp://` — такие записи попадут в `sharp()` и тихо упадут через `console.warn`.

{% endcut %}
||
||
KI-261
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`getContextStatus` режет только по запятой
|
{% cut "Развернуть" %}

<code>
const parts = context.split(',').map(s => s.trim()).filter(s => s !== '');
</code>

`split(',')` — единственный разделитель. Если в `frontmatter` написано `context: breadcrumb post-processing html` (через пробелы, без запятых), то `parts = ['breadcrumb post-processing html']`, `count = 1` — статья получит статус `low` (Мало), хотя по смыслу контекстов три.

Модуль `contexts` (pre-обработка) в `extractContextTagValue` использует другой разделитель:

<code>
const terms = contextValue.split(/[\s,]+/).map(t => t.trim().toLowerCase());
</code>

То есть `contexts` признаёт и пробел, и запятую, а `contextmap` — только запятую. **Несогласованность форматов** между pre- и post-обработкой.

Практический эффект: если автор документации ставит `context: ` через пробел (что валидно для `contexts`), на карте контекстов статья будет выглядеть «с одним контекстом». В `context-search.client.js` (`contexts/client`) `split(',')` — тоже только запятая. То есть и `contextmap`, и клиентский поиск считают по запятой, а pre-обработка `contexts` — по запятой и пробелу. Источник расхождений — в дизайне формата `context:`.

{% endcut %}
||
||
KI-262
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`helpMap` не нормализует `context`
|
{% cut "Развернуть" %}

В `app-help-contents.json` поле `context` может содержать нестандартные формы:

- с заглавными буквами (`Breadcrumb`);
- с лишними пробелами (`breadcrumb ,  post-processing`);
- с завершающей запятой (`breadcrumb,`);
- с юникод-разделителями (`breadcrumb；post-processing` — точка с запятой в китайской локали).

`contextmap` тоже не нормализует: `split(',')` даст `['breadcrumb', 'post-processing']` в лучшем случае, но `['breadcrumb', '', 'post-processing']` при двойной запятой — после `.filter(s => s !== '')` двойная запятая не создаст фантомов, а вот лишние пробелы останутся только если они внутри сегмента (после `trim` исчезнут).

То есть `contextmap` толерантен к пробелам вокруг запятых (`.trim()`), но не к другим разделителям.

{% endcut %}
||
||
KI-263
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`generationContextmap` в VS Code генерирует три отчёта
|
{% cut "Развернуть" %}

Команда `diplodoc-helper.generateContextmap` (в меню `Debug`) вызывает `ux_contextmap_generate`, а та — **три** `runGeneration` подряд:

<code>
runGeneration({ ..., command: 'periodicTable', ... });       // bytescounter
runGeneration({ ..., command: 'periodicTableContext', ... }); // contextmap
runGeneration({ ..., command: 'periodicTableHelpTag', ... }); // helptagmap
</code>

Пользователь ожидает «сгенерировать карту контекстов», а получает все три отчёта. Если это осознанное решение — стоит переименовать команду (например, `generateAllReports`) и добавить в заголовок «(все отчёты)». Если нет — разделить на три отдельные команды по имени.

{% endcut %}
||
||
KI-264
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`runGeneration` в `contextmap.Generate.js` вызывается синхронно
|
{% cut "Развернуть" %}

`ux_contextmap_generate` — `async`, но внутри:

<code>
runGeneration({ ... });
runGeneration({ ... });
runGeneration({ ... });
</code>

`await` отсутствует. `runGeneration` из `contentNavigator/generateNavigationContent.js` **синхронная** (нет `async`), поэтому `await` и не нужен. Но если в будущем кто-то сделает `generateBytesCounterPage` асинхронной (например, для ленивой загрузки данных), код в VS Code-обёртке сломается без изменений (запустит три параллельно и не дождётся).

{% endcut %}
||
||
KI-265
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`lang: ["ru", "en"]` захардкожено
|
{% cut "Развернуть" %}

Как и в `bytescounter`. CLI-команда `periodicTableContext` не принимает `--langs`. Если в проекте только `ru` — вторая половина пуста («No articles for this language»). Если добавится третий язык — правка кода.

{% endcut %}
||
||
KI-268
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`ARTICLE_STATUS_I18N` читает `document.documentElement.lang`
|
{% cut "Развернуть" %}

<code>
function ARTICLE_STATUS_I18N(status) {
    const uiLang = document.documentElement.lang &#124;&#124; 'ru';
    const t = ARTICLE_STATUS_I18N_TEXTS[uiLang] &#124;&#124; ARTICLE_STATUS_I18N_TEXTS.ru;
    return t[status] &#124;&#124; status;
}
</code>

`document.documentElement.lang` выставляется в `core-renderer.js` (`renderLang` → `document.documentElement.lang = currentLang`). Если `core-renderer` по какой-то причине не отработал, `uiLang` = `'ru'` (fallback), и подписи статусов будут на русском даже для английской страницы.

{% endcut %}
||
||
KI-269
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
`getStatsHTML` считает статусы по **всей** матрице, а не по видимой части
|
{% cut "Развернуть" %}

Функция проходит по `matrixData.matrix`:

<code>
for (const row of matrixData.matrix) {
    for (const cell of row) {
        for (const art of cell) {
            statusCounts[art.status] = (statusCounts[art.status] &#124;&#124; 0) + 1;
            total++;
        }
    }
}
</code>

Это **все** статьи, включая «Текст раздела» и «Прочее». То есть в `#stats` показывается статистика по всем статьям документации, а не только по «основной части» (главам). Для `contextmap` это нормально (нас интересует весь корпус), но может удивить: «Всего статей: 487», хотя на таблице видно 400 плиток — 87 «лишних» это `index.md` разделов и «прочее».

{% endcut %}
||
||
KI-270
|
unknown
|
major
|
[`МодульКартаконтекстов`](../МодульКартаконтекстов/index.md)
|
Наследуемые ограничения от `Pagebuilder.common`
|
{% cut "Развернуть" %}

Всё, что применимо к `bytescounter`, применимо и здесь:

- «Глава» и «Раздел» — эвристика по префиксу имени папки;
- `lang: ['ru', 'en']` захардкожено;
- `stripLinks` не используется (нет `title`-очистки);
- размер считается по `.md`.

{% endcut %}
||
||
KI-271
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
VS Code-команда — «мёртвая»
|
{% cut "Развернуть" %}

`diplodoc-helper.helpMap.Generate.js` не экспортирует `ux_helpmap_generate` (файл содержит только `require`-блок). В `commands/index.js` хендлер получает `undefined`. Команда зарегистрирована в `package.json`, но вызов ничего не делает (или падает с ошибкой регистрации — зависит от версии VS Code).

Два способа починить:

- **быстро** — добавить в файл настоящую реализацию, по образцу `diplodoc-helper.context.Generate.js`;
- **чисто** — удалить `diplodoc-helper.generateHelpMaps` из `package.json` и `commands/index.js`, оставив генерацию только через CLI (как `gosts`, у которого нет VS Code-команды для полной регенерации).

{% endcut %}
||
||
KI-272
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
`segregation` не используется в пайплайне
|
{% cut "Развернуть" %}

`docs-build.js` вызывает `cli('helpMap')` **без** флага `--segregation`. Значит, `build/<lang>/app-help-contents.json` в стандартной сборке не создаются, хотя код для этого есть. Все потребители читают `build/app-help-contents.json` — общий массив с обоими языками, каждый потребитель сам фильтрует по `item.lang`.

Если `segregation: true` включить, появятся дополнительные файлы, но `contentNavigator` и `context-search` всё равно читают не их, а общий. Двойной источник правды — потенциальный баг, если один из файлов окажется неактуальным.

{% endcut %}
||
||
KI-273
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
`getParentTitles` ломается на одноимённых папках
|
{% cut "Развернуть" %}

<code>
const parentDir = path.join(docsDir, ...parts.slice(0, startIdx + parentParts.indexOf(parent) + 1));
</code>

`parentParts.indexOf(parent)` ищет **первое** вхождение по имени. Для `docs/ru/foo/bar/foo/article.md`:
- `parts` = `['ru', 'foo', 'bar', 'foo', 'article.md']`, `startIdx = 1`;
- `parentParts` = `['foo', 'bar', 'foo']`;
- первая итерация: `parent = 'foo'`, `indexOf = 0`, `parentDir = docs/ru/foo`. Правильно.
- вторая итерация: `parent = 'bar'`, `indexOf = 1`, `parentDir = docs/ru/foo/bar`. Правильно.
- третья итерация: `parent = 'foo'`, `indexOf = 0` (первое вхождение!), `parentDir = docs/ru/foo`. **Неправильно** — должно быть `docs/ru/foo/bar/foo`.

В итоге `parents` для статьи в `docs/ru/foo/bar/foo/article.md` получит заголовок из `docs/ru/foo/index.md` вместо `docs/ru/foo/bar/foo/index.md`.

Правильно было бы использовать индекс в массиве (`parentParts.forEach((parent, i) => …)`), а не `indexOf`.

{% endcut %}
||
||
KI-275
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
`title` может быть пустым
|
{% cut "Развернуть" %}

`title: title.trim() &#124;&#124; defaultTitleValue` (где `defaultTitleValue: ''`) — если в frontmatter нет ни `title`, ни `pureTitle`, в JSON уйдёт пустая строка. Потребители (`contentNavigator`, `context-search`) такое отфильтровывают, но в самом JSON запись с пустым `title` есть.

{% endcut %}
||
||
KI-276
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
`hint`, `helptag`, `context` не нормализуются
|
{% cut "Развернуть" %}

Все три поля берутся как есть: `.trim()` и всё. `context: "breadcrumb, post-processing"` останется строкой с запятой. Разбиение на массив — задача потребителя. `helpMap` не проверяет ни формат, ни допустимые значения (опечатка в `helptag` попадёт в JSON без предупреждения).

{% endcut %}
||
||
KI-277
|
unknown
|
major
|
[`МодульКартапомощи`](../МодульКартапомощи/index.md)
|
`data.hint?.trim()` — молчаливый `undefined`
|
{% cut "Развернуть" %}

<code>
hint: data.hint?.trim() &#124;&#124; defaultHintValue,
</code>

Если в frontmatter `hint: 42` (число), `42?.trim()` выбросит `TypeError` — `trim` не функция. В `try/catch` файла это ловится, но файл целиком пропускается (`failed.push(fullPath)`). То есть одна «неправильная» статья выкидывает всю её метаинформацию из `app-help-contents.json` без явного предупреждения пользователю (только в `console.error`).

{% endcut %}
||
||
KI-278
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
Статус `excess` недостижим — легенда врёт
|
{% cut "Развернуть" %}

`getHelptagStatus` возвращает `excess` только если `count > 1`. Но `count` вычисляется как `hasHelptag ? 1 : 0` — всегда 0 или 1. То есть:

- `empty` — когда `helptag` пуст;
- `normal` — когда `helptag` непуст;
- `excess` — **никогда**.

При этом в легенде на странице отображается три цвета:

</code>
▮ >1 helptag       (color-excess)    ← не появляется ни разу
▮ Один helptag     (color-normal)
▮ Нет helptag (0)  (color-empty)
</code>

Пользователь видит «избыток» в легенде, но никогда не увидит ни одной плитки этого цвета. Вводит в заблуждение — кажется, что в проекте всё идеально, а на деле просто «избыток» не считается.

Ожидаемое поведение (по аналогии с `contextmap`): разбить `helptag` по запятой и считать число тегов. Тогда `>1 helptag` (например, `nomenclature, invoice`) даст `excess`, а строка без запятой — `normal`.

Починка — три строки:

<code>
const parts = String(art.helptag &#124;&#124; '').split(',').map(s => s.trim()).filter(s => s !== '');
const count = parts.length;
</code>

И `colorMap` уже содержит ключ `excess` — ничего больше не нужно.

{% endcut %}
||
||
KI-279
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
`ARTICLE_STATUS_I18N_TEXTS` содержит `excess` — «Без тэгов» / «Один тэг» / «Избыточно»
|
{% cut "Развернуть" %}

Третья запись (`excess: 'Избыточно'`) — мёртвая, потому что `excess` не назначается статьям. Согласовано с пунктом выше.

{% endcut %}
||
||
KI-280
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
«тэгов» с «э» — расхождение с общей терминологией
|
{% cut "Развернуть" %}

В `ARTICLE_STATUS_I18N_TEXTS.ru`:

- `empty: 'Без тэгов'` (с «э»);
- `normal: 'Один тэг'` (с «э»).

При этом везде в остальном коде и документации — «тег»/«теги» (без «э», калька с англ. `tag`). Мелочь, но в UI страницы пользователь видит «тэг» — это может сбивать при поиске по документации.

{% endcut %}
||
||
KI-281
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
`getTitle` показывает всю строку `helptag` без форматирования
|
{% cut "Развернуть" %}

<code>
title += '\n' + art.helptag.trim();
</code>

Если `helptag: "nomenclature, invoice, report, dashboard"` — в `title`-подсказке плитки всё это выведется одной строкой. Длинный текст в тултипе. Не баг, но UX: можно было бы обрезать или форматировать по запятой.

{% endcut %}
||
||
KI-282
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
CLI-команда `periodicTableHelpTag` — «тихая»
|
{% cut "Развернуть" %}

`generateHelpTagPage` — синхронная функция без `return`-значения. В CLI:

<code>
} else if (command === 'periodicTableHelpTag') {
    generateNavigationContent({ mapDir: outputDir, outputDir, command, docsDir });
}
</code>

`process.exitCode` не устанавливается. Если `app-help-contents.json` отсутствует, `generateGenericTableFromArticles` печатает `console.error('❌ File … was not found…')` и `return;` — `process.exitCode` остаётся `0`. То есть в `docs-build.js` шаг `periodicTableHelpTag` при отсутствии данных «успешно» завершится, но `helptagmap.html` не появится. См. `Pagebuilder.common.js`:

<code>
if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File ${jsonPath} was not found. …`);
    return;   // ← без process.exitCode
}
</code>

Общее для всех трёх отчётов.

{% endcut %}
||
||
KI-283
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
Все ограничения `Pagebuilder.common` применимы
|
{% cut "Развернуть" %}

Как и к `bytescounter`/`contextmap`:

- «Глава» и «Раздел» — эвристика по префиксу имени папки;
- `lang: ['ru', 'en']` захардкожено;
- `preferredLang` в `localStorage` — общий для семейства;
- `navLinks` дублируются между отчётами.

{% endcut %}
||
||
KI-284
|
unknown
|
major
|
[`МодульКартасправочныхтегов`](../МодульКартасправочныхтегов/index.md)
|
Отчёт «по наличию поля» — не «по качеству поля»
|
{% cut "Развернуть" %}

`helptagmap` показывает: `helptag` есть или нет. Не проверяет:

- **формат** — `helptag: "Nomenclature"` с заглавной, `helptag: "nomenclature "` с хвостовым пробелом, `helptag: "NOMENCLATURE"` (всё это — `normal` статус, хотя фронтенд может искать по нормализованному значению);
- **допустимость** — `helptag: "asdf-не-существует"` — тоже `normal`;
- **дубликаты** — если у двух статей одинаковый `helptag`, это не диагностируется.

Проверка `helptag` на валидность (если понадобится) — отдельная задача, ни `helpMap`, ни `helptags`, ни `helptagmap` её сейчас не решают.

{% endcut %}
||
||
KI-285
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
Клик по ссылке внутри ячейки триггерит row-click
|
{% cut "Развернуть" %}

`onRowClick` вешается на `<tr class="gost-main-row">`. Если в ячейке есть `<a href>` (через `formatMarkdown` — например, `title: "См. [раздел](../foo.md)"`), клик по ссылке откроет ссылку **и** раскроет/закроет карточку. Мешает UX.

Фикс — `if (e.target.closest('a')) return;` в `onRowClick`.

{% endcut %}
||
||
KI-286
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`formatMarkdown` экранирует HTML, но не санитизирует `url`
|
{% cut "Развернуть" %}

<code>
return safe.replace(/\[([^16]]+)\]\(([^17]+)\)/g, (match, linkText, url) => {
    const isExternal = url.startsWith('http');
    const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${url}"${targetAttr}>${linkText}</a>`;
});
</code>

Если `url` содержит `javascript:alert(1)` (автор словаря ошибся) — это выполнится при клике. Не XSS через данные пользователя (автор словаря доверенный), но `javascript:` не заблокирован явно.

Фикс — проверка `if (/^javascript:/i.test(url)) return match;`.

{% endcut %}
||
||
KI-287
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`formatMarkdown` — только `[text](url)`
|
{% cut "Развернуть" %}

Не поддерживает `![alt](url)`, `<a href>`, `**bold**`, курсив. Только inline-ссылки. Для `description` в ГОСТе это разумно, но не документировано.

{% endcut %}
||
||
KI-288
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`escape` не обёрнуто в `data-*`
|
{% cut "Развернуть" %}

Если в `description` встретится `[text](url)` с `]` или `)` внутри `text`/`url` — сломается парсинг. Регулярка простая, не учитывает вложенность.

{% endcut %}
||
||
KI-289
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`getSortedGroups` — `sortedTypes = Object.keys(groups).sort()`
|
{% cut "Развернуть" %}

Алфавитная сортировка групп. «ГОСТ» vs «Классификатор» — по Unicode, с учётом регистра (`'Г'` < `'К'`, ок). Но если пользователь добавит группу `'прочее'` (lowercase) — она окажется **после** `'ГОСТ'` и `'Классификатор'`, несмотря на алфавит. `.sort()` без localeCompare — чувствителен к регистру.

{% endcut %}
||
||
KI-290
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`formatMarkdown(item.date &#124;&#124; '—')` — `date` может быть `Date`
|
{% cut "Развернуть" %}

В YAML `date: 01.05.2002` парсится как строка (не как дата). Но если кто-то напишет `date: 2002-05-01` — `js-yaml` может распарсить как `Date`. `String(date)` → `'Wed May 01 2002 …'` — не то, что ожидалось. См. `gosts.dictionary.writer` — пишет через `yaml.dump(entry.date)`, что сохранит исходный формат. Но при ручном редактировании YAML — риск.

{% endcut %}
||
||
KI-291
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`state.openCardId` — только одна открытая карточка
|
{% cut "Развернуть" %}

Если пользователь открыл карточку A, потом кликнул на B — A закроется, B откроется. Одновременное открытие нескольких карточек **не поддерживается**. Дизайн-решение (сохранить «чистый» вид), но для пользователя, который хочет сравнить два ГОСТа — неудобно.

{% endcut %}
||
||
KI-292
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`renderTable()` вызывается целиком на каждое изменение
|
{% cut "Развернуть" %}

`innerHTML` пересоздаётся. Для 200 ГОСТов — ~200 DOM-узлов главной таблицы + 200 карточек. Быстро, но при большом числе (1000+) — заметно.

{% endcut %}
||
||
KI-293
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`hashchange` сбрасывает `openCardId`
|
{% cut "Развернуть" %}

Если пользователь открыл карточку, потом кликнул на другую ссылку на странице (внутри карточки — например, «см. также» с `#gost-…`), `hashchange` сбросит `openCardId` и раскроет новую. Старая карточка закроется. Ожидаемо, но неочевидно.

{% endcut %}
||
||
KI-294
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`MutationObserver` не отключается
|
{% cut "Развернуть" %}

`obs.observe(document.body, { childList: true, subtree: true })` — подписка на всё DOM. На странице с большим числом изменений — перерасход. `initGostsTable()` возвращает `true` при `data-gosts-init='1'`, так что логической ошибки нет, но лишние вызовы.

{% endcut %}
||
||
KI-295
|
unknown
|
major
|
[`МодульКлиентГОСТов`](../МодульКлиентГОСТов/index.md)
|
`anchorId` fallback — расхождение с `gost.Insert`
|
{% cut "Развернуть" %}

Если `anchorId` не предвычислен (`data.js` создан до фикса #2), клиент использует `code.replace(/[^18]/g, '_').toLowerCase()` — кириллица сохраняется. `gost.Insert` (VS Code) использует `slugify_latin_alphanumeric(code)` — кириллица транслитерируется. Ссылки из VS Code ведут на `#gost-gost_1_1_2002`, а в DOM `id="gost-гост_1_1_2002"` — не совпадают, flash/expand не работают. Фикс — `gosts.injector` теперь пишет `anchorId`, но старые проекты не получат его без пересборки.

{% endcut %}
||
||
KI-296
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
Контексты с пробелом ломают ссылку
|
{% cut "Развернуть" %}

`a.href = '/' + currentLang + '/contexts/' + encodeURIComponent(item.label) + '.html'` — где `label` — исходный контекст (lowercase, `.trim()`). Файл `contexts/<slugify_filename(term)>.html` создаётся из `term` через `slugify_filename` (пробел → `_`).

Расхождение для контекстов с пробелом:
- `label = "product catalog"` → `href = contexts/product%20catalog.html`;
- файл = `contexts/product_catalog.html`.

404.

Правильно — использовать `item.slug` (в `__CONTEXT_ITEMS__` есть, но не используется) и генерировать его тем же `slugify_filename`, что и `contexts.writer`.

{% endcut %}
||
||
KI-297
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`slug` не совпадает с именем файла
|
{% cut "Развернуть" %}

Даже если использовать `item.slug`:

<code>
const slug = context.replace(/\s+/g, '');
</code>

`slug` = `"productcatalog"` (пробелы удалены). Файл = `"product_catalog"` (пробел → `_`). Всё равно не совпадает.

Правильно — в `context-tags.js` при формировании `contextItems` использовать `slugify_filename` из `contexts.writer`/`utils/encoding.slugify`. Или в `context-tags.client` вызывать `slugify_filename` — но клиент не знает про этот модуль (не импортирует).

{% endcut %}
||
||
KI-298
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
Inline-стили в `<script>` — дублирование
|
{% cut "Развернуть" %}

При каждом вызове (если `#context-tags-container` нет) — новый `<style>` в `<head>`. Если когда-нибудь появится SPA — 10 копий. Сейчас неактуально.

{% endcut %}
||
||
KI-299
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
Retry без ограничения
|
{% cut "Развернуть" %}

<code>
if (!container) {
    setTimeout(insertContextTags, 300);
    return;
}
</code>

Бесконечный retry. Если `.dc-doc-page__main` не появится (шаблон сломан) — каждые 300 мс вызов, вечно.

{% endcut %}
||
||
KI-300
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`MutationObserver` отсутствует
|
{% cut "Развернуть" %}

В отличие от `abbrs.client`, `terms.client`, `footnotes.client`, здесь нет `MutationObserver`. Если `.dc-doc-page__main` появляется позже 300 мс — retry через 300 мс справится. Но если появляется через 100 мс — первая попытка не сработает, ждёт 300 мс. Небольшая задержка на страницах с быстрым рендером.

{% endcut %}
||
||
KI-301
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`visibleCount = 5` — захардкожено
|
{% cut "Развернуть" %}

Не через `context-tags.config`. Не через `window.__CONTEXT_ITEMS__`. Если нужно 10 — правка кода.

{% endcut %}
||
||
KI-302
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`context-tags.js` не настраивается через CLI
|
{% cut "Развернуть" %}

`runGeneration(buildDir)` — вызывается из `docs-build.js` (фаза `post`, `cli('contexttags', './build')`). Других параметров нет. Язык — из URL (`/ru/` / `/en/`). Контексты — из `<meta name="context">`.

{% endcut %}
||
||
KI-303
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`a.target` — не задан
|
{% cut "Развернуть" %}

Все ссылки на `contexts/<slug>.html` — в текущей вкладке. Для внутренней навигации — норма. Но если пользователь хочет параллельно смотреть статью и контекст — открывать в новой вкладке вручную.

{% endcut %}
||
||
KI-304
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`item.label` не экранируется при `encodeURIComponent`
|
{% cut "Развернуть" %}

`encodeURIComponent` корректно работает с юникодом. Но если `label` содержит `/` (например, `context: "foo/bar"`) — `encodeURIComponent` превратит в `%2F`, браузер загрузит `contexts/foo%2Fbar.html` (404, потому что `slugify_filename` превратит `/` в `_`).

{% endcut %}
||
||
KI-305
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`MutationObserver` и `context-tags` — отсутствие синхронизации с `contexts`
|
{% cut "Развернуть" %}

Если `contexts` не запущен (пользователь забыл `--skip=contexts`), `contexts/<slug>.html` не существует. Ссылки ведут на 404. Клиент не проверяет существование — просто рисует `<a href>`.

{% endcut %}
||
||
KI-306
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
`document.head` — без проверки
|
{% cut "Развернуть" %}

<code>
document.head.appendChild(style);
</code>

Если `document.head` не существует (редкость в HTML5) — `TypeError`. Не поймано. На практике всегда есть.

{% endcut %}
||
||
KI-307
|
unknown
|
major
|
[`МодульКлиентконтекстныхтегов`](../МодульКлиентконтекстныхтегов/index.md)
|
Inline-скрипт `__CONTEXT_ITEMS__` — данные для каждой страницы
|
{% cut "Развернуть" %}

`context-tags.js` для каждой HTML-страницы генерирует **свой** `<script>` с её контекстами. Для 500 страниц — 500 разных инлайн-скриптов (по 200–500 байт каждый). Дублирование стилей (одинаковых) — 500 копий. Можно было бы вынести стили в общий CSS, а `__CONTEXT_ITEMS__` — в `<script type="application/json">` с id страницы.

Сейчас — работает, но HTML «толстеет» на ~1 KB × N страниц.

{% endcut %}
||
||
KI-309
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
Retry 15 секунд
|
{% cut "Развернуть" %}

60 попыток × 250 мс = 15 секунд. Если `footnotesData` загрузился, но `.dc-doc-page__body` не появился (например, шаблон изменился) — 15 секунд таймеров. Незаметно по эффекту, но неаккуратно.

{% endcut %}
||
||
KI-310
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
`footnotesData` не сбрасывается между страницами
|
{% cut "Развернуть" %}

Если когда-нибудь появится SPA-навигация, `footnotesData` останется в памяти. Сейчас неактуально (Diplodoc — полная перезагрузка).

{% endcut %}
||
||
KI-312
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
`esc` не оборачивает `url`
|
{% cut "Развернуть" %}

<code>
return '<a class="cell-link" href="' + esc(url) + '">' + cleanText + '</a>';
</code>

`url` экранируется. `cleanText` — **нет**. Если в `text` был `<script>alert(1)</script>`, `stripLinks` удалит `<a>`, но `<script>` останется. Не XSS через данные пользователя (автор словаря), но стоит помнить.

{% endcut %}
||
||
KI-313
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
Сортировка по `article` — `localeCompare('ru')`
|
{% cut "Развернуть" %}

Для английских заголовков — `localeCompare('ru')` всё равно работает (ICU-collation), но порядок может отличаться от `localeCompare('en')`. Для мультиязычной документации — минор.

{% endcut %}
||
||
KI-314
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
`state` не сохраняется
|
{% cut "Развернуть" %}

При перезагрузке страницы — сброс сортировки. `localStorage` не используется. Для UX-постоянства — можно было бы сохранять `state.column`/`state.direction`. Не реализовано.

{% endcut %}
||
||
KI-315
|
unknown
|
major
|
[`МодульКлиентперечнясносок`](../МодульКлиентперечнясносок/index.md)
|
`lang` из `footnotesData` не используется
|
{% cut "Развернуть" %}

`footnotesData.lang` (`'ru'`/`'en'`) есть в data, но клиент его не читает. `«Всего сносок: …»` — захардкожено по-русски. Если страница `en`, всё равно по-русски. Несогласовано с `core-renderer` (там I18N).

{% endcut %}
||
||
KI-316
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
Не подключается автоматически
|
{% cut "Развернуть" %}

`contexts` копирует скрипт в `docs/_assets/scripts/context-search.js`, `@diplodoc/cli` переносит в `build/_assets/scripts/`. Но `<script>` в HTML **не** вставляется. Пользователь должен сам добавить в `.yfm` или в `contexts/index.md`. Без подключения — интерфейс поиска не появится, панель «Поиск» будет пустой.

{% endcut %}
||
||
KI-317
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`split(',')` без пробелов — расхождение с `contexts`
|
{% cut "Развернуть" %}

`contexts.extractor` использует `split(/[\s,]+/)` (запятая ИЛИ пробел). `context-search.client` (и `contextmap`, и `helpMap`) — `split(',')` (только запятая). Пользователь, написавший `context: breadcrumb post-processing` (без запятых), увидит одно «контекстное значение» `breadcrumb post-processing`. В `contexts` это два терма, здесь — один.

{% endcut %}
||
||
KI-318
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`terms.every()` — точное совпадение
|
{% cut "Развернуть" %}

`invoice` не найдёт `invoice-line`. Нет префиксного поиска или регекспа. Пользователь должен вводить точные контексты.

{% endcut %}
||
||
KI-319
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`hintDiv` — только по последнему слову
|
{% cut "Развернуть" %}

`updateHint()` ищет подсказки только по **последнему** слову в инпуте. Если пользователь набрал `nomen invo` — подсказки по `invo`, а не по `nomen`. Логично (текущий ввод), но не помогает «найти следующий контекст».

{% endcut %}
||
||
KI-320
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`preferredLang` не используется
|
{% cut "Развернуть" %}

В отличие от `core-renderer`, `context-search.client` не читает `localStorage.preferredLang`. Язык определяется по URL (`getLang()`) — первый сегмент пути `(/ru/&#124;/en/)`. Если пользователь открыл `contexts/index.html` в `en`, но `preferredLang` = `ru` (из `bytescounter`) — поиск всё равно будет `en`. Не баг, но несогласовано.

{% endcut %}
||
||
KI-321
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`contextData` не сбрасывается между инициализациями
|
{% cut "Развернуть" %}

Если `tryInitialize` вызовется на новой странице (Diplodoc делает полную перезагрузку, но если в будущем появится SPA-навигация) — `dataLoaded` останется `true`, `contextData` — от старой страницы. Сейчас неактуально.

{% endcut %}
||
||
KI-322
|
unknown
|
major
|
[`МодульКлиентскийпоискпоконтекстам`](../МодульКлиентскийпоискпоконтекстам/index.md)
|
`JSON.parse` ошибки не логируются
|
{% cut "Развернуть" %}

`buildSearchDataFromAppHelp` вызывается внутри `.then`, если `JSON.parse` внутри `r.json()` упадёт — `.catch` перехватит, `console.error`, `contextData = { ru: [], en: [] }`. Работает, но пользователь не поймёт, что JSON битый.

{% endcut %}
||
||
KI-323
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`slug` не совпадает с `slugify_filename`
|
{% cut "Развернуть" %}

<code>
const slug = context.replace(/\s+/g, '');
</code>

Для `context = 'product catalog'` → `slug = 'productcatalog'`. А `contexts.writer.writeTermFiles` создаёт файл `contexts/<slugify_filename('product catalog')>.html` → `contexts/product_catalog.html` (пробел → `_`, потому что `slugify_filename` заменяет `[^22]` на `_`).

`context-tags.client` использует **`label`**, не `slug` (см. `5.1-038`), так что `slug` в `__CONTEXT_ITEMS__` — вообще мёртвое поле. Но если кто-то в будущем начнёт использовать `slug` — расхождение с реальным именем файла.

Правильно — в `generateContextScript` использовать `slugify_filename` (из `utils/encoding.slugify`):

<code>
const { slugify_filename } = require('../utils/encoding.slugify');
const slug = slugify_filename(context);
</code>

Это **одна строка** и решает проблему на будущее.

{% endcut %}
||
||
KI-324
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`toLowerCase()` без `.trim()` — пробелы в label
|
{% cut "Развернуть" %}

<code>
const context = c.toLowerCase();
</code>

`c` — уже `.trim()`-нутый в `runGeneration`:

<code>
const contexts = contextMeta[1]
    .split(CONTEXT_SPLITTER)
    .map(s => s.trim())
    .filter(Boolean);
</code>

Так что `c` — без пробелов по краям. `.toLowerCase()` — корректно. Но если в `<meta content>` контекст с внутренними пробелами (`'product catalog'`), `label = 'product catalog'` — сохранится. Правильно.

{% endcut %}
||
||
KI-325
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`split(',')` — расхождение с `contexts.extractor`
|
{% cut "Развернуть" %}

`CONTEXT_SPLITTER = ','` — только запятая. `contexts.extractor` использует `split(/[\s,]+/)` (запятая ИЛИ пробел). `contextmap`, `context-search.client`, `presetsStat` — тоже `split(',')`.

Итог: если пользователь написал `context: breadcrumb post-processing` (через пробел, без запятых) — в `<meta>` Diplodoc сгенерирует `<meta content="breadcrumb post-processing">`. `context-tags` сделает `split(',')` → `['breadcrumb post-processing']` — **один** контекст с пробелом. `contexts` (pre) — два контекста. Расхождение: на странице `contexts/breadcrumb.html` будет статья, а в чипах — `breadcrumb post-processing`.

Правильно — унифицировать splitter: `[\s,]+`.

{% endcut %}
||
||
KI-326
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`lang = rel.split('/')[0]` — может быть `'index.html'`
|
{% cut "Развернуть" %}

Для `build/index.html` (корень):

- `rel = 'index.html'` (без `/`);
- `rel.split('/')[0] = 'index.html'`;
- `'index.html' &#124;&#124; 'ru'` = `'index.html'` (строка truthy);
- `window.__CONTEXT_LANG__ = 'index.html'`.

Клиент потом использует `currentLang` в `a.href = '/' + currentLang + '/contexts/<slug>.html'` — получится `/index.html/contexts/<slug>.html`. 404.

Практически: `build/index.html` в корне — это редирект-страница Diplodoc (или `404.html`), у неё **нет** `<meta name="context">` (нет frontmatter). Так что `runGeneration` её пропустит (`contextMeta === null`). Баг не проявляется в норме, но при ручном `<meta>` — да.

Фикс — проверять, что `lang` из двух букв:

<code>
const lang = /^[a-z]{2}$/i.test(rel.split('/')[0]) ? rel.split('/')[0] : 'ru';
</code>

{% endcut %}
||
||
KI-327
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
Нет идемпотентности
|
{% cut "Развернуть" %}

`runGeneration` **всегда** вставляет `<script>` перед `</body>`. При повторном запуске (watch, повторная сборка) — дубликаты.

Но! `context-tags.client` (клиент) проверяет `if (document.getElementById('context-tags-container')) return;` — то есть **клиент** идемпотентен (не создаст второй блок). Но `<script>` в HTML накапливаются: каждая копия — новый IIFE, каждая устанавливает `window.__CONTEXT_ITEMS__` (перезаписывает), каждая вызывает `insertContextTags()` — который создаст блок (первая) или выйдет (вторая+).

Итог: N копий `<script>` в HTML, N IIFE, каждый запускается, но только первый создаёт блок. Работает, но HTML «толстеет».

Фикс — маркер `id="dl-context-tags"`:

<code>
if (content.includes('id="dl-context-tags"')) return;
newContent = newContent.slice(0, bodyCloseIndex) +
    '\n<script id="dl-context-tags">\n' + script + '\n</script>\n' +
    newContent.slice(bodyCloseIndex);
</code>

{% endcut %}
||
||
KI-328
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
Regex `<meta>` — жёсткий порядок атрибутов
|
{% cut "Развернуть" %}

<code>
/<meta\s+name="context"\s+content="([^23]*)"\s*\/?>/i
</code>

Требует: `name` **перед** `content`, двойные кавычки, пробел между ними. Если Diplodoc изменит порядок (`content` перед `name`) — не сработает. Если добавит другие атрибуты (`<meta name="context" content="…" data-x="y">`) — `[^23]*` не сработает (потому что после `content="…"` ожидается `\s*\/?>`, а там ` data-x`).

Текущий Diplodoc ставит `<meta name="context" content="…">` — работает. Но при обновлении Diplodoc может сломаться.

{% endcut %}
||
||
KI-329
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`fs.readFileSync(templatePath)` — без проверки существования
|
{% cut "Развернуть" %}

<code>
const templatePath = path.join(__dirname, 'context-tags.client.js');
const clientScriptCode = fs.readFileSync(templatePath, 'utf8');
</code>

Если `context-tags.client.js` отсутствует (например, при standalone-сборке не включён в пакет) — `throw ENOENT`. `runGeneration` **не** ловит (try/catch только внутри `walk`-callback, а `generateContextScript` вызывается **внутри** callback — ловится, но `console.error` + `results.failed.push(htmlPath)`). То есть **все** страницы попадут в `failed` с одинаковой ошибкой.

Фикс — `if (!fs.existsSync(templatePath)) { console.error(…); return results; }`.

{% endcut %}
||
||
KI-330
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`fs.readFileSync` на каждую страницу
|
{% cut "Развернуть" %}

`generateContextScript` вызывается для каждой страницы с `<meta name="context">`. Внутри — `fs.readFileSync(templatePath)`. Для 500 страниц — 500 чтений одного и того же файла (~10 KB). Мелочь, но можно было бы прочитать один раз в `runGeneration` и передавать строкой.

{% endcut %}
||
||
KI-331
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`runGeneration` не пишет `toc.yaml` / `index.yaml`
|
{% cut "Развернуть" %}

`context-tags` — **только** инжектор. Раздел «Контексты» (`docs/ru/contexts/`) создаётся модулем [`contexts`](../МодульКонтексты/index.md), а `context-tags` добавляет чипы в **каждую** статью. Это не «страница раздела», а «блок в каждой статье».

То есть `context-tags` не требует `toc.yaml`. Правильно, но может смутить при чтении кода (другие модули с `runGeneration` создают страницы).

{% endcut %}
||
||
KI-332
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`console.log` с `results.success.length` — общее число
|
{% cut "Развернуть" %}

`[ContextTags] Обработано 87 файлов, ошибок 3` — по всему `build/`. Не детализирует, **какие** файлы упали. Для отладки — `console.error` на каждый `catch` есть, но в итоговом логе — только счётчики.

{% endcut %}
||
||
KI-333
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`walk` из `utils/walk.js` — симлинки
|
{% cut "Развернуть" %}

<code>
function walk(dir, filter, callback) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath, filter, callback);
        else if (filter(fullPath, entry)) callback(fullPath);
    }
}
</code>

`entry.isDirectory()` для символической ссылки на папку — **`false`** (`withFileTypes: true` возвращает `isSymbolicLink()` для символов). Значит, симлинки-папки **пропускаются**. Для `build/` не критично (там нет симлинков), но стоит помнить.

{% endcut %}
||
||
KI-334
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`context-tags` не удаляет старые `<script>`
|
{% cut "Развернуть" %}

Если пользователь **изменил** `context:` в frontmatter и пересобрал — старый `<script>` останется (с прошлыми контекстами), новый добавится рядом. На странице два `<script>` с разными `__CONTEXT_ITEMS__` — выполнится **последний** (перезапишет глобальную переменную). Но в HTML — мусор.

Фикс — тот же `id="dl-context-tags"` + replace, а не append.

{% endcut %}
||
||
KI-335
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`if (require.main === module)` — без проверки `docs-build.js`
|
{% cut "Развернуть" %}

Если пользователь запускает `node src/plugins/context-tags/context-tags.js` из `docs/`, скрипт обработает `./build` в `docs/build` (не `docs/../build`). `path.resolve('./build')` — относительно **cwd**. Если cwd = `docs/`, обработается `docs/build/` — не тот. Для CLI через `diplodoc-helper-cli.js` — `outputDir` передаётся явно (`./build`), это работает.

{% endcut %}
||
||
KI-336
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`CONTEXT_SPLITTER = ','` — не конфигурируется
|
{% cut "Развернуть" %}

Константа в начале файла. Если пользователь использует другой разделитель (`;`, `&#124;`) — придётся править код. Не критично (стандарт — запятая), но негибко.

{% endcut %}
||
||
KI-337
|
unknown
|
major
|
[`МодульКонтекстныетеги`](../МодульКонтекстныетеги/index.md)
|
`context-tags` и `context-search.client` — рассинхрон
|
{% cut "Развернуть" %}

`context-search.client` (клиент на странице `contexts/index.html`) — использует `split(',')`, как и `context-tags`. `contexts.extractor` (pre) — `split(/[\s,]+/)`. Три модуля, два разных подхода. Если пользователь пишет `context: breadcrumb post-processing` (без запятых):

- `contexts` (pre) — 2 контекста, страницы `breadcrumbs.html` и `post-processing.html` созданы;
- `context-tags` (post, этот модуль) — 1 контекст `'breadcrumb post-processing'`, чип ведёт на `contexts/breadcrumb%20post-processing.html` — 404;
- `context-search.client` — 1 контекст `'breadcrumb post-processing'`, статья не находится при поиске по `breadcrumb`.

Три модуля, три разных результата. Унификация — отдельная задача (не в этом модуле).

{% endcut %}
||
||
KI-338
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
Кириллические имена файлов модуля
|
{% cut "Развернуть" %}

Два файла в `src/plugins/contexts/` начинаются с **кириллической** `с` (U+0441), а не латинской `c` (U+0063):

- `сontexts.js`
- `сontexts.collector.js`

В `require`-строках используется та же кириллическая буква, поэтому на Windows всё работает (файловая система не нормализует юникод). На Linux/macOS при клонировании, архивировании или копировании — файлы могут «отвалиться» (визуально неотличимы, но имена разные). `grep` по `contexts` в shell может не находить. Рекомендуется переименовать в латиницу — это ломающий change (все `require`), но без него сохраняется риск на не-Windows-платформах.

{% endcut %}
||
||
KI-339
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
`contexts.generator.js` — мёртвый код
|
{% cut "Развернуть" %}

Файл содержит функцию `main()`, читает `./docs` и `['ru', 'en']` захардкоженно. Нигде не импортируется: ни в CLI, ни в `commands/index.js`, ни в `docs-build.js`. Похоже на более раннюю версию модуля. Может сбить с толку при чтении; безопасно удалить (или переименовать в `.legacy.js`).

{% endcut %}
||
||
KI-340
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
Нет `contexts.paths.yaml` — путь захардкожен
|
{% cut "Развернуть" %}

В отличие от `abbrs`, `terms`, `gosts`, у `contexts` нет конфига с путями. Выходная папка `langDir/contexts/` и скрипт `docs/_assets/scripts/context-search.js` прописаны в коде. Если понадобится другая папка — правка кода и пересборка.

{% endcut %}
||
||
KI-342
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
`writeTocAndIndexYaml` — второй генератор toc.yaml, неиспользуемый
|
{% cut "Развернуть" %}

В `contexts.writer.js` две похожие функции: `writeTocAndIndexYaml` (простая, без навигации) и `writeTocAndIndexYamlComplete` (с `logo`, `header`, ссылками на `/ru/...`). Вызывается только вторая. Первую можно удалить или явно пометить как deprecated.

{% endcut %}
||
||
KI-343
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
`sortTocItems` не применяется к папке `contexts/`
|
{% cut "Развернуть" %}

`writeTocAndIndexYamlComplete` пишет `toc.yaml` в том порядке, в каком термы пришли из `sortedTerms` (алфавитный по `localeCompare` с `sensitivity: 'base'`). Для `abbrs`/`terms`/`gosts` также используется алфавитный порядок, но `toc.yaml` там устроен проще. Если в будущем понадобится сортировка по `rank` (популярные сверху) — правка в одном месте.

{% endcut %}
||
||
KI-344
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
`collapseTail` с порогом 3 — захардкожен
|
{% cut "Развернуть" %}

`TAIL_PIVOT_RANK = 3` в `сontexts.js`. Всё, что встречается реже трёх раз, уходит в «Прочее». Порог не настраивается ни через CLI, ни через `.yfm`. Если в проекте почти все контексты встречаются 1–2 раза, «Прочее» будет включать почти всё, а основные страницы будут пустыми.

{% endcut %}
||
||
KI-345
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
Treemap: `&#123;` и `&#125;` вместо `{` `}`
|
{% cut "Развернуть" %}

В `generateMapContent` перед возвратом:

<code>
return (legend + '\n' + svgHtml).replace(/{/g, '&#123;').replace(/}/g, '&#125;');
</code>

Это защита от подстановки переменных (Diplodoc-шаблонизатор). 
Без неё SVG с фигурными скобками (например, в `style="..."`) был бы интерпретирован как <code>&#123;&#123;VAR&#125;&#125;</code> при совпадении. 
Хрупкое место: если в будущем кто-то добавит фигурные скобки **вне** SVG (например, в легенду), они тоже будут заменены — что может быть нежелательно.

{% endcut %}
||
||
KI-346
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
Поиск зависит от `app-help-contents.json`
|
{% cut "Развернуть" %}

Если `helpMap` не отработал (или отработал с ошибкой — файл отсутствует), клиентский поиск не инициализируется: `fetch` вернёт 404, `console.error` в DevTools, страница контекстов остаётся без работающего поиска. Явной диагностики на этапе сборки нет.

{% endcut %}
||
||
KI-347
|
unknown
|
major
|
[`МодульКонтексты`](../МодульКонтексты/index.md)
|
`getParentTitles` из `helpMap` и `resolveFolderTitle` из `contexts` — разные алгоритмы
|
{% cut "Развернуть" %}

Оба читают `title` родительских `index.md`, но реализованы независимо:

- `helpMap` (`getParentTitles`) — плоский массив заголовков для JSON;
- `contexts` (`resolveFolderTitle`) — один заголовок на папку, с кешем, читает `title` → `pureTitle`.

Дублирование логики. Если появится третье место, где нужен заголовок родителя, будет три разных алгоритма.

{% endcut %}
||
||
KI-348
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

`if (!uri) return;` — команда видна в палитре (`Ctrl+Shift+P` → «Копировать ссылку на документ»), но без контекста Explorer ничего не делает. Пользователь ожидает диалог выбора файла, получает ничего.

Аналогично `section.*` командам — `when` в `package.json` разрешает вызов из палитры (нет `"when": "false"` в `commandPalette`). Единое решение для всех команд — запретить вызов из палитры через `commandPalette` или добавить `showOpenDialog` как fallback.

{% endcut %}
||
||
KI-349
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`fs.statSync` без `try/catch`
|
{% cut "Развернуть" %}

<code>
const stats = fs.statSync(fsPath);
</code>

Если файл/папка исчезли между кликом и вызовом (например, пользователь удалил папку через `section.Delete` в параллельном окне VS Code, а в этом окне Explorer ещё показывает кэш), `fs.statSync` бросит `ENOENT`. Исключение не поймано — VS Code покажет общую ошибку расширения.

Правильно — обернуть в `try/catch` и `showErrorMessage('Файл не найден: …')`.

{% endcut %}
||
||
KI-350
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`buildTitle` не использует `title` из frontmatter
|
{% cut "Развернуть" %}

<code>
const section = IndexMdFileRead(fsPath);
return section?.pureTitle &#124;&#124; path.basename(fsPath);
</code>

Если `index.md` содержит только `title: 'Раздел 1. Введение'` (без `pureTitle`), то `section.pureTitle` — `undefined`, fallback — `path.basename(fsPath)` = `'Раздел1.Введение'` (имя папки без пробелов).

Пользователь ожидает скопировать ссылку на «Раздел 1. Введение», а в буфере `sourceLinkName: 'Раздел1.Введение'`. При вставке через `link.Paste` в текст статьи попадёт `[Раздел1.Введение](…)` вместо `[Раздел 1. Введение](…)`.

Правильный порядок — `pureTitle` → `title` → `basename`:

<code>
const section = IndexMdFileRead(fsPath);
if (section?.pureTitle) return section.pureTitle;
if (section?.title) return section.title;
return path.basename(fsPath);
</code>

{% endcut %}
||
||
KI-351
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`buildTitle` не убирает `.md` из имени файла
|
{% cut "Развернуть" %}

Для файла `foo.md` → `title = 'foo.md'`. При вставке `link.Paste` вставит `[foo.md](…/foo.md)` — в тексте ссылки будет видно расширение `.md`, что некрасиво.

Ожидаемое: `[foo](…/foo.md)` (без `.md` в тексте). Сейчас — с `.md`.

Если файл — картинка (`foo.png`), `title = 'foo.png'`. При вставке через `link.Paste` → `buildFigure(url, altText, id)` с `altText = 'foo.png'`. Не критично, но `altText` в `<figure>` будет с `.png`.

Правильно — убирать расширение для `.md`-файлов и оставлять как есть для картинок (или убирать `.png`, если альтернативный текст — «читаемое» имя).

{% endcut %}
||
||
KI-352
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`when` не покрывает `.jpeg`, `.gif`, `.webp`
|
{% cut "Развернуть" %}

`isImage` (в коде) покрывает `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`. `when` в `package.json` — только `.png`, `.jpg`, `.svg`.

Практический эффект: на файле `.jpeg`, `.gif`, `.webp` команда **не видна** в контекстном меню. Пользователь не может скопировать ссылку на такую картинку — придётся идти в редактор, вставлять вручную.

Расширить `when` до `resourceExtname == .jpeg &#124;&#124; resourceExtname == .gif &#124;&#124; resourceExtname == .webp` — одна строка.

{% endcut %}
||
||
KI-353
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`JSON.stringify(data)` без `\n` / indent
|
{% cut "Развернуть" %}

В буфере — однострочный JSON: `{"sourceLinkName":"Введение","sourceLinkPath":"C:\\…","isImage":false}`. С `\n` и indent было бы читаемо для человека, но `parseClipboardLink` (в `link.Paste`) и `canPasteMarkdownLink` (в `extension.js`) ожидают именно JSON.parse, и indent не сломает.

То есть **можно** печатать с indent для отладки (`console.log(clipboardText)` показывает содержимое). Сейчас — компактно. Не баг, но неудобно при отладке через «Developer: Inspect Clipboard».

{% endcut %}
||
||
KI-354
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`isImage` — не влияет на поведение в этой команде
|
{% cut "Развернуть" %}

`isImage` кладётся в JSON, но `link.Copy` сам его не использует. Его использует `link.Paste`:

<code>
if (isImage) {
    return shouldRenderAsHtml ? buildDocumentLink('!', linkName, mdPath, true) : buildImageLink(linkName, mdPath);
}
</code>

Значит, если пользователь копирует **папку**, в которой лежат **картинки** (а не `.md`), `isImage: false` — правильно (`buildTitle` читает `index.md`). Если копирует `.png` — `isImage: true`.

Но: если пользователь копирует `.md`, `isImage: false`, `sourceLinkName = 'foo.md'`. При вставке `link.Paste` пойдёт по ветке «не картинка» — `[foo.md](…/foo.md)`. Ок.

{% endcut %}
||
||
KI-355
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`targetPath` — избыточная переменная
|
{% cut "Развернуть" %}

<code>
let targetPath = fsPath;
let title = buildTitle(stats, fsPath);
const data = {
    sourceLinkName: title,
    sourceLinkPath: targetPath,
    …
};
</code>

`targetPath` — просто `fsPath`. Отдельная переменная не нужна. Возможно, планировалось что-то ещё (например, `fs.realpath` для симлинков), но не реализовано.

{% endcut %}
||
||
KI-356
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
Симлинки
|
{% cut "Развернуть" %}

`fs.statSync` следует по симлинкам. Если пользователь выбрал симлинк на папку, `fsPath` — путь к симлинку (не к цели). `IndexMdFileRead` попробует прочитать `<symlink>/index.md` — сработает (папка-цель имеет `index.md`). Но `sourceLinkPath` в JSON будет **симлинк-путь**, а не реальный. При вставке `link.Paste` вычислит относительный путь к симлинку — это может «не совпасть» с ожидаемым (например, если симлинк указывает за пределы `docs/`, относительный путь будет с `..`, который `@diplodoc/cli` не соберёт).

`fs.realpathSync(fsPath)` вместо `fsPath` — решило бы. Сейчас не делается.

{% endcut %}
||
||
KI-357
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
Сообщение не показывает путь
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(translate('plugin.link.copy.info.success', title));
</code>

NLS: `"Ссылка на «{0}» скопирована в буфер"`. `{0}` = `title` (имя). Путь не упоминается. Если пользователь копирует папку «Введение», а таких папок в проекте несколько (в разных языках) — сообщение одинаковое. Пользователь не знает, какая именно папка в буфере.

Правильно — добавить `sourceLinkPath` в сообщение или в `detail` (но `showInformationMessage` не поддерживает `detail`, как `showWarningMessage` с `modal: true`).

{% endcut %}
||
||
KI-358
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`link.Copy` не проверяет, что `fsPath` — `.md`, `.png` или папка
|
{% cut "Развернуть" %}

`when` в `package.json` фильтрует вызов. Но если `link.Copy` вызвать программно (например, из другой команды), она примет **любой** путь: `.yaml`, `.js`, `.css`. `isImage` вернёт `false`, `sourceLinkName` — имя файла. `link.Paste` потом вставит `[config.yaml](…/config.yaml)` в `.md` — что не имеет смысла.

`when` — единственная защита. Программный вызов — без защиты. Не критично (публичного API для `link.Copy` нет), но стоит документировать.

{% endcut %}
||
||
KI-359
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
Нет обработки длинных путей Windows (>260)
|
{% cut "Развернуть" %}

`fs.statSync` на пути > 260 символов на Windows бросит `ENAMETOOLONG`. `try/catch` нет — ошибка в консоль VS Code. Фикс — `toExtendedPath` (как в `figures.js`). Не реализовано.

{% endcut %}
||
||
KI-360
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`sourceLinkPath` — абсолютный путь в JSON
|
{% cut "Развернуть" %}

При переносе проекта в другую папку (или другую машину) сохранённый JSON перестаёт работать: `sourceLinkPath` указывает на `C:\projects\…\docs\…`, а на новой машине — `/home/…/docs/…`. `link.Paste` попытается `path.relative` от текущего файла к несуществующему абсолютному пути — результат будет бессмысленный.

Практически: JSON из буфера используется в течение минуты (пока пользователь не переключился на целевой файл и не вставил). Долгосрочное хранение не предусмотрено. Но если пользователь случайно сохранил буфер в файл — это ловушка. Не баг текущего сценария.

{% endcut %}
||
||
KI-361
|
unknown
|
major
|
[`МодульКопированиессылки`](../МодульКопированиессылки/index.md)
|
`link.Copy` — не идемпотентна «в хорошем смысле»
|
{% cut "Развернуть" %}

Повторный вызов на том же объекте перезаписывает буфер тем же JSON. Работает. Но если пользователь вызвал `link.Copy` на объекте A, потом `link.Copy` на объекте B, потом `Ctrl+V` в текстовом редакторе (не через `link.Paste`) — вставится JSON от B. Пользователь мог забыть, что копировал.

Дизайн: JSON в буфере — «ссылка для вставки через `link.Paste`», а не «текст для обычной вставки». Разделение явное, но требует знания. Если пользователь не знает про пару Copy/Paste — удивится, что `Ctrl+V` вставил JSON.

{% endcut %}
||
||
KI-362
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
Нет Diagnostic-ов — только QuickPick
|
{% cut "Развернуть" %}

В отличие от `linter.links`, результат `linter.abbrs` не попадает в панель Problems. Это значит:

- нельзя «фильтровать» по файлу;
- нельзя «переходить по Tab» из Problems;
- нельзя интегрировать в CI через `vscode.Diagnostic`-механизм (если бы был headless-режим).

Пользователь видит список только пока открыт `QuickPick`. Закрыл — забыл. Для ревью перед релизом может быть неудобно (нет «постоянной» видимости).

Причина — дизайн-выбор: много `<abbr>` в тексте, диагностики на каждую — визуальный шум. Но если пользователь часто ловит «сирот», стоило бы сделать Diagnostics **по запросу** (например, флаг в конфиге — показывать ли диагностики).

{% endcut %}
||
||
KI-364
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`languages: ['ru', 'en']` — захардкожено
|
{% cut "Развернуть" %}

`lintAbbrs(docsRoot, options)` принимает `options.languages`, но VS Code-команда вызывает без `options`:

<code>
await vscode.window.withProgress(…, async () => {
    issues = lintAbbrs(docsRoot);
});
</code>

То есть всегда `['ru', 'en']`. Если добавится `de` — линтер его не проверит (молча).

{% endcut %}
||
||
KI-365
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`SKIP_DIRS` захардкожен
|
{% cut "Развернуть" %}

<code>
const SKIP_DIRS = new Set(['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);
</code>

Глобально по имени, не по пути. Если у пользователя есть папка `figures/` с обычными статьями — они не будут проверены. То же для `contexts/`, `helptags/`, `roadmap/`.

С одной стороны, это защищает от «ложных срабатываний» на выходной папке `abbrs/` (её `index.md` содержит `<abbr data-abbr="…">` для каждой записи — проверять бессмысленно). С другой — если пользователь по своим причинам создал `docs/ru/figures/my-article.md` — он выпадет из проверки.

{% endcut %}
||
||
KI-366
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`<abbr>` внутри код-блоков **не** проверяются, но `<abbr>` в HTML тоже нет
|
{% cut "Развернуть" %}

`lintFile` ищет `<abbr>…</abbr>` по всему `.md`, включая `.md`-блоки кода (</code>` </code>html ... </code> </code>`). Это даёт ложные срабатывания: если в примере кода есть `<abbr>ИСО</abbr>`, а в словаре `ИСО` нет — линтер покажет «не найдено», хотя это **пример кода**, а не использование в статье.

Правильно — `maskCodeInMarkdown` перед regex-поиском (как в `extractAbbrsFromFile` из `abbrs.extractor`). Сейчас `linter.abbrs` этого не делает — расхождение с `extractor`-ом.

{% endcut %}
||
||
KI-367
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`line`/`character` — позиция начала `<abbr>`, не `<abbr>`-контента
|
{% cut "Развернуть" %}

`offsetToPosition(content, m.index)` — где `m.index` — индекс `<` в `<abbr>`. То есть `line/character` указывают на `<abbr>`, а не на текст внутри. `revealRange(new vscode.Range(pos, pos))` — курсор окажется в позиции `<`. Работает, но если пользователь ожидает попасть в середину слова — нет.

{% endcut %}
||
||
KI-368
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`hasAbbr`-проверка чувствительна к регистру
|
{% cut "Развернуть" %}

`dictionary.has(lookupAbbr)` — точное совпадение `abbr` из YAML и `<abbr>`-ключа. `ИСО` ≠ `исо`. Если в статье `<abbr>исо</abbr>`, а в словаре `abbr: ИСО` — линтер покажет «не найдено», хотя `abbrs.dictionary.writer` добавляет записи с `abbr` как есть (с учётом регистра).

Пользователь может решить, что «надо переименовать» — но в словаре запись уже есть, просто в другом регистре. У `abbr.Add` (CodeAction) есть подсказка «без учёта регистра» — но **линтер** этой нормализации не делает.

{% endcut %}
||
||
KI-369
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`QuickPick` с `label: $(warning) abbr` — не локализован
|
{% cut "Развернуть" %}

`$(warning)` — иконка Codicon, работает. Но `placeHolder`:

<code>
const placeHolder = translate(nls_ts.plugin.linter.abbrs.pick.placeholder, issues.length);
</code>

Использует NLS-перевод. В `package.nls.json` есть ключ `plugin.linter.abbrs.pick.placeholder`: `"Not defined in dictionary: {0}. Choose to jump to file."` — то есть переводится.

Ок, здесь претензий нет.

{% endcut %}
||
||
KI-370
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`languages` не влияет на `docsRoot`
|
{% cut "Развернуть" %}

`resolveDocsRoot(uri)` находит `docs/`, а `lintAbbrs` сам разбивает на языки. Если у пользователя структура `docs/ru/...`, `docs/en/...`, но `docs/de/...` — `linter.abbrs` проигнорирует `de` (не в списке). Если структура другая (например, `docs/docs-ru/`) — `resolveDocsRoot` не найдёт папку с basename `docs`, вернёт `workspaceFolders[0] + '/docs'` — и линтер ищет `docs/ru/`, которых нет. Тихо: `issues = []`, info «Все сокращения определены».

{% endcut %}
||
||
KI-371
|
unknown
|
major
|
[`МодульЛинтераббревиатур`](../МодульЛинтераббревиатур/index.md)
|
`withProgress` блокирует UI
|
{% cut "Развернуть" %}

`withProgress` без `cancellable: true` — пользователь не может отменить линтер, даже если он работает минуту на 1000+ статей. `cancellable: false` (по умолчанию). Для типичного проекта — секунды, не критично. Для большого — неприятно.

{% endcut %}
||
||
KI-372
|
unknown
|
major
|
[`МодульЛинтерссылок`](../МодульЛинтерссылок/index.md)
|
`hasAnchor` не находит якоря Diplodoc
|
{% cut "Развернуть" %}

Проверка якоря — regex `/(?:id&#124;name)\s*=\s*["']<anchor>["']/i`. Она находит только **inline HTML**:

</code>html
<div id="anchor"></div>
<a name="anchor"></a>
</code>

Но Diplodoc поддерживает markdown-якоря:

<code>

{% endcut %}
||
||
KI-373
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`<abbr class="term">` внутри код-блоков — ложные срабатывания
|
{% cut "Развернуть" %}

`lintFile` не маскирует код-блоки перед regex. Если в примере кода:

`<code>
</code>html
<abbr class="term">Пример</abbr>
</code>
</code>`

и в `terms.yaml` нет «Пример» — линтер покажет «не найдено», хотя это **пример кода**. `terms.extractor.extractTermsFromFile` использует `maskCodeInMarkdown` — линтер **не** использует. Расхождение.

{% endcut %}
||
||
KI-374
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`<abbr class="term">` с `data-term` и без — считаются по-разному
|
{% cut "Развернуть" %}

`lookupTerm = dataTerm &#124;&#124; innerText`:

- `<abbr class="term" data-term="Абстракция">абстракций</abbr>` — проверяется `Абстракция`;
- `<abbr class="term">Абстракция</abbr>` — проверяется `Абстракция`.

Оба варианта допустимы. Линтер корректно проверяет `data-term`, если он есть. Но если `data-term` содержит опечатку (`data-term="Абстрацкия"`), а `innerText` правильный — линтер проверит `Абстрацкия` и покажет «не найдено», хотя пользователь имел в виду `Абстракция` из `innerText`.

{% endcut %}
||
||
KI-375
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`resolveDocsRoot` дублируется
|
{% cut "Развернуть" %}

`linter.abbrs` и `linter.terms` содержат **идентичную** реализацию `resolveDocsRoot` в своих `*.linter.js` (файлы `src/commands/diplodoc-helper.linter.abbrs.js` и `...terms.js`). Дублирование в двух местах. При изменении (например, поиск `docs` по regex, или работа с мульти-workspace) — править в двух файлах.

{% endcut %}
||
||
KI-376
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`title=` — не проверяется
|
{% cut "Развернуть" %}

Если у `<abbr class="term" title="…">` есть `title`, линтер его **пропускает**. Предполагается, что `title` — inline-override «я знаю, что делаю». Но это означает: пользователь может поставить `title="Абстракция"` и обойти линтер, хотя в словаре термина нет. Тултип от `terms.injector` **тоже** будет не от словаря, а от `title` — но на странице «Список терминов» записи не будет.

{% endcut %}
||
||
KI-377
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`languages: ['ru', 'en']` — захардкожено
|
{% cut "Развернуть" %}

Как и в `linter.abbrs`. `lintTerms` принимает `options.languages`, но VS Code-команда не передаёт. Третий язык не проверяется.

{% endcut %}
||
||
KI-378
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`SKIP_DIRS` — копия
|
{% cut "Развернуть" %}

<code>
const SKIP_DIRS = new Set(['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);
</code>

Список тот же, что у `linter.abbrs`, но **порядок другой** (`terms` первым). В JS `Set` порядок не важен для `has`, но копипаст заметен.

{% endcut %}
||
||
KI-379
|
unknown
|
major
|
[`МодульЛинтертерминов`](../МодульЛинтертерминов/index.md)
|
`withProgress` без `cancellable`
|
{% cut "Развернуть" %}

Как и `linter.abbrs`. На большом проекте — нельзя отменить.

{% endcut %}
||
||
KI-380
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`t` вычисляется один раз при загрузке модуля
|
{% cut "Развернуть" %}

<code>
const uiLang = document.documentElement.lang &#124;&#124; 'ru';
const t = I18N[uiLang] &#124;&#124; I18N.ru;
</code>

`document.documentElement.lang` на момент выполнения скрипта (`defer`) — изначально `'ru'` (или пустой). `initApp` потом ставит `document.documentElement.lang = currentLang`, но `t` уже вычислен. То есть при `en`-странице `t` — русский.

Практически: `renderTable` использует `t.chapterHeader`, `t.noData` и т.д. — они по-русски даже для `en`. `config.getStatsHTML` получает `t` как аргумент, но тоже с русскими значениями.

Фикс — пересчитывать `t` внутри `renderTable`:

<code>
function renderTable(lang, matrixData, config) {
    const t = I18N[lang] &#124;&#124; I18N.ru;
    // …
}
</code>

Или — в `initApp` перед `renderTable`:

<code>
const t = I18N[currentLang] &#124;&#124; I18N.ru;
</code>

(но `t` — в замыкании модуля, надо переделать).

{% endcut %}
||
||
KI-381
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`renderStatusCell` — мёртвый код
|
{% cut "Развернуть" %}

<code>
function renderStatusCell(status, container) {
    if (!container) return;
    const colorMap = { … };
    const colorClass = colorMap[status.status] &#124;&#124; 'color-empty';
    const displayText = status.value !== undefined ? status.value : '';
    container.innerHTML = `<div class="status-cell ${colorClass}" title="${status.label}: ${status.value}">${displayText}</div>`;
}
</code>

Функция определена, но **не используется**. `renderArticles` рендерит `<a class="article-block">` напрямую, не через `renderStatusCell`.

Мёртвый код ~10 строк.

{% endcut %}
||
||
KI-382
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`renderArticles` — inline-стили `display:grid`
|
{% cut "Развернуть" %}

<code>
let html = `<div style="display:grid; grid-template-columns: repeat(${cols}, 3ch); gap:3px; …">`;
</code>

Стили в атрибуте `style` — не через CSS-класс. Для `core-style.css` — громоздко, но работает. Если появится тема, которая хочет переопределить grid — придётся через `!important`.

{% endcut %}
||
||
KI-383
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`article-block` — размер `3ch × 3ch` фиксирован
|
{% cut "Развернуть" %}

Для больших экранов — слишком мелко; для маленьких — нормально. Адаптивности нет.

{% endcut %}
||
||
KI-384
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`#cell-R-C` — глобальный `id`
|
{% cut "Развернуть" %}

</code>html
<td><div id="cell-${r}-${c}"></div></td>
</code>

`id` начинается с `cell-0-0`, `cell-0-1`, … — уникальны в пределах страницы. Но если на одной странице несколько таблиц (например, два `bytescounter` в разных языках — не бывает, но теоретически) — коллизия.

Практически не встречается (один отчёт = одна таблица).

{% endcut %}
||
||
KI-385
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`config.getTitle` — не экранирует `art.title`
|
{% cut "Развернуть" %}

<code>
getTitle(art, t) { return `${art.title} (${art.size} ${t.bytes})`; }
</code>

`art.title` вставляется в `title="…"` (HTML-атрибут). Если `title` содержит `"` — сломает атрибут. `Pagebuilder.common` не экранирует `title` при создании `matrixData`. Симптом: тултип плитки обрезается на первой кавычке.

{% endcut %}
||
||
KI-387
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`article-block` — все ссылки `target="_blank"`
|
{% cut "Развернуть" %}

<code>
html += `<a href="${art.url}" target="_blank" class="article-block …">`;
</code>

Открывает в новой вкладке. Для внутренних ссылок документации — нестандартно (Diplodoc обычно без `target=_blank`). Пользователь кликает по плитке, открывается новая вкладка с той же документацией.

{% endcut %}
||
||
KI-388
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`renderLegend` — глобальный поиск `#legend-container`
|
{% cut "Развернуть" %}

<code>
container = document.getElementById('legend-container');
</code>

Если контейнера нет — `console.warn`. Для `page-template.html` — есть. Если шаблон изменится — легенда не отрендерится.

{% endcut %}
||
||
KI-389
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`getStatsHTML` вызывается с `t` из модуля
|
{% cut "Развернуть" %}

`config.getStatsHTML(lang, matrixData, t)` — `t` из замыкания `core-renderer` (русский, см. первое ограничение). Модули ожидают, что `t` соответствует `lang`, но получают `ru`-вариант.

{% endcut %}
||
||
KI-390
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`renderLang` использует `localStorage` без проверки доступности
|
{% cut "Развернуть" %}

<code>
const savedLang = localStorage.getItem('preferredLang');
</code>

В `private browsing` / `file://` — `localStorage` может бросить `SecurityError`. Не поймано — скрипт падает, все три отчёта не рендерятся.

{% endcut %}
||
||
KI-391
|
unknown
|
major
|
[`МодульОбщийрендерер`](../МодульОбщийрендерер/index.md)
|
`renderLang` — не перерисовывает `navLinks`/`legend`
|
{% cut "Развернуть" %}

При клике на кнопку `EN` — только `renderTable` вызывается. `navLinks` и `legend` остаются от `ru`. Для `navLinks` — терпимо (ссылки одинаковые). Для `legend` — описания на `ru` (например, «Избыток (>6)»).

Фикс — в обработчике клика: `renderLegend(legendItems)` с обновлённым `t`. Но `legendItems` — из `periodicData` (в замыкании `initApp`), надо прокидывать.

{% endcut %}
||
||
KI-393
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`process.exit(1)` — немедленный выход при ошибке
|
{% cut "Развернуть" %}

<code>
catch (e) {
    console.error(`❌ ${step.name}: ${e.message}`);
    process.exit(1);
}
</code>

`process.exit(1)` завершает Node **немедленно**, не давая шанса cleanup-обработчикам (например, `process.on('exit')`). Если предыдущие шаги оставили открытые дескрипторы или несохранённые данные — потеряются.

Правильно — `process.exitCode = 1; return;` (мягкий выход). `main` продолжит цикл, следующий шаг **выполнится**. Или — `process.exitCode = 1; break;` (выход из цикла, но не из Node).

{% endcut %}
||
||
KI-394
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`--arg value` не поддерживается
|
{% cut "Развернуть" %}

<code>
else if (a.startsWith('--phase=')) out.phase = a.slice(8).split(',').filter(Boolean);
</code>

Только `--phase=pre,build`. `--phase pre` — `a = '--phase'`, `a = 'pre'` — не матчит `--phase=`. Оба игнорируются. Пользователь, привыкший к `git --branch main`, удивится.

{% endcut %}
||
||
KI-395
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`--skip` без `--only` — но `--only` без `--skip` — работают
|
{% cut "Развернуть" %}

`shouldRun` логически корректен: `--only` фильтрует «только эти», `--skip` фильтрует «все, кроме этих». Комбинация — `--only=a,b --skip=a` → выполнится `b`.

Но: если пользователь передал `--only=`, `new Set(''.split(',').filter(Boolean))` = пустой `Set`. `opts.only` = пустой Set (truthy), `opts.only.has(step.name)` = `false` для всех → **все шаги пропущены**. Молчаливый «ничего не сделал».

{% endcut %}
||
||
KI-396
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`--list` — только имена шагов, без описания
|
{% cut "Развернуть" %}

<code>
console.log(`  - ${s.name}${off}`);
</code>

Не показывает фазу, команду, длительность. Для ориентира — минимально.

{% endcut %}
||
||
KI-397
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`step.cwd` — по умолчанию `projectRoot`
|
{% cut "Развернуть" %}

<code>
const projectRoot = path.resolve(__dirname, '..');
</code>

`__dirname` = `src/plugins/`. `path.resolve(__dirname, '..')` = `src/`. То есть `cwd` для шагов — `src/`, **не** корень проекта (`docs/..`). См. «Известные ограничения» — это критично для `CLI = './plugins/diplodoc-helper-cli.js'`. Если `cwd = src/`, то `./plugins/diplodoc-helper-cli.js` = `src/plugins/diplodoc-helper-cli.js` — **существует**. Ок.

Но если пользователь запускает `docs-build.js` из **своего** проекта (шаблон, куда `installer` скопировал `plugins/`), то `__dirname` = `<project>/plugins/`, `projectRoot = <project>/`. `cwd = <project>/`, `CLI = './plugins/diplodoc-helper-cli.js'` — **существует** (скопирован). Ок.

То есть логика правильная, но работает по соглашению: `docs-build.js` всегда в `plugins/` (или `src/plugins/`), а `diplodoc-helper-cli.js` — рядом.

{% endcut %}
||
||
KI-398
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`NODE_PATH` — от `projectRoot`
|
{% cut "Развернуть" %}

<code>
NODE_PATH: process.env.NODE_PATH &#124;&#124; path.join(projectRoot, 'node_modules')
</code>

Если `projectRoot = src/` (в **расширении**), то `node_modules` — `src/node_modules/`, которого **нет**. `NODE_PATH` не найдёт модули.

В расширении `src/` — `node_modules` в корне (`<extension>/node_modules/`). `src/node_modules/` — нет. Значит, `NODE_PATH` для дочерних процессов **не сработает** (модули не найдутся).

Практически: дочерние процессы — `node ./plugins/diplodoc-helper-cli.js …` → `require('@diplodoc/cli')` **не** делается (используется `npx`). `require` внутренних модулей — относительные пути (`./helpMap/…`), не нуждаются в `NODE_PATH`. Так что работает случайно.

Для пользователя (шаблон) — `projectRoot = <project>/`, `node_modules` — есть. Работает.

{% endcut %}
||
||
KI-399
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`buildShellCommand` — только Windows
|
{% cut "Развернуть" %}

На Unix — `spawnSync(cmd, args, { shell: false })`. Без shell-функции. Правильно.

Но `buildShellCommand` для Windows — обёртка **каждого** аргумента в кавычки, если есть спецсимволы. `npx @diplodoc/cli -i ./docs -o ./build` — `./docs` не содержит спецсимволов, не оборачивается. `-i`, `-o` — тоже. Работает.

Если аргумент — `--dataPath ./plugins/roadMap/roadmap-data.json` (с `/`) — `/` **не** спецсимвол Windows, не оборачивается. Работает.

Если аргумент — `--targetHtml ./build/ru/Дополнительнаяинформация/Переченьсносок/index.html` (кириллица) — `/` не спецсимвол, но **кириллица** — не в `[a-zA-Z0-9._\-=:,/\\@+]`. Обёртывается в `"…"`. `cmd.exe` с `"…"` — обрабатывает корректно. Работает.

{% endcut %}
||
||
KI-400
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`run('clean build', …)` — `fs.rmSync` без `try/catch`
|
{% cut "Развернуть" %}

<code>
run('clean build', () => {
    fs.rmSync(buildDir, { recursive: true, force: true });
}),
</code>

`force: true` — не бросает при отсутствии `build/` (первый запуск). Ок.

Но если `build/` есть и в нём — файл, занятый другим процессом (Windows) — `rmSync` с `force: true` не бросает, но и не удаляет. Молча. Дальше `@diplodoc/cli` пишет в занятый `build/` — может дать ошибку. Не диагностируется.

{% endcut %}
||
||
KI-401
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`steps` порядок — захардкожен в массиве
|
{% cut "Развернуть" %}

Если шаги зависят друг от друга (например, `createFigureContent` требует `reindexFigures`), порядок в массиве — **единственная** гарантия. Нет явных зависимостей, нет топологической сортировки. При добавлении нового шага — легко поставить не туда.

{% endcut %}
||
||
KI-402
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`docs-build.js` не в `module.exports` — только `STEPS`, `PHASES`
|
{% cut "Развернуть" %}

<code>
module.exports = { STEPS, PHASES };
</code>

Экспортируется **только** `STEPS` и `PHASES`. `main`, `execute`, `parseArgs` — не экспортируются. Для внешних интеграций (require('docs-build').main) — `undefined`.

{% endcut %}
||
||
KI-403
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
Нет `--dry-run`
|
{% cut "Развернуть" %}

Пользователь не может «посмотреть, что будет выполнено, без выполнения». `--list` показывает имена, но не команды. Правильно — `--dry-run` с выводом `spawnSync`-команды для каждого шага.

{% endcut %}
||
||
KI-404
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`run`-шаги не логируют свои действия
|
{% cut "Развернуть" %}

`run('clean build', () => fs.rmSync(...))` — единственный лог: `✓ clean build (0.02s)`. Что именно удалено (какие файлы) — не пишется. Для аудита/отладки — не хватает.

{% endcut %}
||
||
KI-405
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`--phase=build` без `pre` — сломается
|
{% cut "Развернуть" %}

Если пользователь запускает только `build`-фазу (`--phase=build`), то `pre`-шаги не выполняются. `docs/` в «сыром» состоянии (без `presets.yaml`, без `reindexFigures`). `@diplodoc/cli --apply-presets internal` упадёт, потому что `presets.yaml` нет.

Правильно — либо документировать «`--phase=build` только после `--phase=pre`», либо добавить проверку.

{% endcut %}
||
||
KI-406
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`docs-build.js` — `.cmd`-обёртка только для Windows
|
{% cut "Развернуть" %}

<code>
@echo off
node "%~dp0docs-build.js" %*
</code>

Для Linux/macOS — нет `.sh`-обёртки. Пользователь должен запускать `node ./plugins/docs-build.js` вручную.

{% endcut %}
||
||
KI-407
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`--quiet` в `@diplodoc/cli` — уменьшает вывод, но не отключает
|
{% cut "Развернуть" %}

<code>
npx('diplodoc build', '@diplodoc/cli', '-i', './docs', '-o', './build', '--allow-custom-resources', '--apply-presets', '--quiet', 'internal'),
</code>

`--quiet` — Diplodoc-специфичный флаг. Ошибки всё равно выводятся. Для CI — ок, для локальной разработки — неинформативно (не видно, какие страницы собираются).

{% endcut %}
||
||
KI-408
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`periodicTable*` — три отдельных шага
|
{% cut "Развернуть" %}

<code>
cli('periodicTable'),
cli('periodicTableHelpTag'),
cli('periodicTableContext'),
</code>

Каждый — отдельный `spawnSync` (новый процесс Node). Для трёх отчётов — три полных запуска с инициализацией. Можно было бы один `cli('allTables')`, но модуль `contentNavigator` не поддерживает `--all`. Не баг, но медленно.

{% endcut %}
||
||
KI-409
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`cleanup service files` — удаляет `.yfm` в `build/`
|
{% cut "Развернуть" %}

<code>
run('cleanup service files', () => {
    for (const f of ['.yfm', '.yfmignore', '.yfmlint']) {
        fs.rmSync(path.join(buildDir, f), { recursive: true, force: true });
    }
}),
</code>

Эти файлы — служебные для `@diplodoc/cli`. В `build/` они не нужны. Удаляются **после** `@diplodoc/cli`, но **до** конца. Если пользователь захочет «отладить сборку» — `.yfm` уже удалён.

{% endcut %}
||
||
KI-410
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`docs-build.js` — нет `npm run docs-build`
|
{% cut "Развернуть" %}

В `package.json`:

<code>on
"scripts": {
    "build": "npm run compile",
    "compile": "npm run generate-manifest && node build.js",
    …
}
</code>

`docs-build.js` **не** вызывается через npm-скрипт. Только вручную (`node ./plugins/docs-build.js`). Пользователь шаблона получает `docs-build.js` (через `installer`), но должен сам добавить npm-скрипт (или запускать напрямую).

{% endcut %}
||
||
KI-411
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`package.json → scripts` — `precompile` вызывает `validate` (lint + type-check + test)
|
{% cut "Развернуть" %}

<code>on
"precompile": "npm run validate",
"validate": "npm run lint && npm run type-check && npm run test",
"lint": "echo ''",   // ← пустой
</code>

`precompile` → `validate` → `lint` (пустой `echo`) + `type-check` + `test`. `npm run compile` сначала запускает `precompile`, потом `generate-manifest`, потом `node build.js`. То есть **тесты и type-check** запускаются при каждой сборке. Медленно, но правильно (защита от регрессий).

`docs-build.js` — **не** через `compile`. Не запускает тесты/type-check. Это правильно (это сборка документации, не расширения), но может смутить.

{% endcut %}
||
||
KI-412
|
unknown
|
major
|
[`МодульОркестраторсборки`](../МодульОркестраторсборки/index.md)
|
`docs-build.js` — `pre`-фаза не «идемпотентна»
|
{% cut "Развернуть" %}

Повторный запуск `--phase=pre` без `clean build` (например, `--only=helpMap`) — работает, но `clean build` не вызывается (потому что `--only` ограничивает). Если пользователь запускает несколько `--only` подряд — `build/` накапливает артефакты. Обычно не проблема, но при отладке — сюрприз.

{% endcut %}
||
||
KI-413
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`buildDir` не читается из `options.docsRoot`
|
{% cut "Развернуть" %}

CLI передаёт `docsRoot`:

<code>
generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
</code>

`runGeneration` читает `options.buildDir`:

<code>
const buildDir = typeof options === 'string' ? options : options?.buildDir &#124;&#124; './build';
</code>

`options.docsRoot` игнорируется. Работает только потому, что `docs-build.js` передаёт `./build` (совпадает с default). `--outputDir ./custom` — не сработает.

Фикс — либо CLI передавать `buildDir`, либо `runGeneration` читать `docsRoot`.

{% endcut %}
||
||
KI-414
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`CURRENT_ENGINE = PLANTUML`, но CLI ставит `MERMAID`
|
{% cut "Развернуть" %}

Та же проблема, что в `roadmap.js`. `post-build.js`:

<code>
const CURRENT_ENGINE = DiagramEngine.PLANTUML;
</code>

CLI:

<code>
generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
</code>

**Фактический движок — Mermaid.** `CURRENT_ENGINE` — мёртвая константа (используется только если `options.engine` не задан — программный вызов). В `docs-build.js` — всегда Mermaid.

{% endcut %}
||
||
KI-415
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`patchPlantUml` — нет идемпотентности
|
{% cut "Развернуть" %}

Каждый запуск вставляет `<script>` повторно. При `docs-build.js` в watch-режиме (или повторной сборке) — на странице накапливаются **дубликаты** клиентского скрипта. Первый экземпляр создаёт `svgPanZoom` и ставит `svg.dataset.panZoomInitialized = 'true'`. Второй экземпляр видит `panZoomInitialized` и выходит (`if (svg.dataset.panZoomInitialized) return;`) — не работает.

Но:

- размер HTML растёт (N копий по ~6 KB);
- в `svgPanZoom` возможны конфликты (два инстанса на одном SVG — не поддерживается);
- DOM много.

Фикс — проверять `content.includes('gantt-toggle-btn')` или специальный маркер (`id="dl-gantt-client"`).

{% endcut %}
||
||
KI-416
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`patchMermaid` — проверка идемпотентности не работает
|
{% cut "Развернуть" %}

<code>
if (!content.includes('initMermaidGanttLinks')) {
    content = content.replace('</body>', `${injectionBundle}\n</body>`);
    …
}
</code>

`initMermaidGanttLinks` — не существует. В `mermaid.client.js` функция называется `initMermaidGantt` (без `Links`). Проверка всегда `false` → каждый запуск добавляет новый `<script>`. Та же проблема, что в `patchPlantUml` — дубликаты.

{% endcut %}
||
||
KI-417
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`patchMermaid` — маркер `mermaid` слишком широкий
|
{% cut "Развернуть" %}

<code>
if (content.includes('js-gantt-mapping') &#124;&#124; content.includes('mermaid')) {
</code>

`content.includes('mermaid')` ловит **любую** страницу, где встречается слово «mermaid»:

- статья «Про Mermaid» в документации;
- пример кода с ` </code>mermaid `;
- ссылка `https://mermaid.js.org`.

Таким страницам инжектится `<script>` с `initMermaidGantt`, который **ничего не находит** (нет `.js-gantt-mapping`). Это лишний `<script>` в HTML, не критично, но «загрязняет» страницы.

Фикс — убрать `&#124;&#124; content.includes('mermaid')`, оставить только `js-gantt-mapping`.

{% endcut %}
||
||
KI-418
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.client.js` — CDN без fallback
|
{% cut "Развернуть" %}

`loadScript('https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/…', …)` — если CDN заблокирован / недоступен / offline — скрипт не загрузится, `initPanZoom` не выполнится, pan/zoom **не работает**. Никакого `onerror` на `<script>`, никакого `showWarningMessage`. Пользователь видит статичную диаграмму и не понимает, почему кнопки не действуют.

Фикс — `script.onerror = () => console.warn('svg-pan-zoom failed to load')` или fallback на локальную копию.

{% endcut %}
||
||
KI-419
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.client.js` — кнопки fit-* — мёртвый код
|
{% cut "Развернуть" %}

<code>
var btnFitWidth = wrapper.querySelector('.js-fit-width');
var btnFitHeight = wrapper.querySelector('.js-fit-height');
var btnFitBoth = wrapper.querySelector('.js-fit-both');
// …
if (btnFitWidth) btnFitWidth.addEventListener('click', fitWidth);
</code>

`controls.builder.js` создаёт **только** `.js-toggle-pan` и `.js-toggle-zoom`. `.js-fit-*` — не создаются. Ветки `if (btnFitWidth)` — никогда не выполняются. Мёртвый код ~40 строк.

Либо убрать из клиента, либо добавить кнопки в `controls.builder.js` (плюс CSS).

{% endcut %}
||
||
KI-420
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.client.js` — `document.querySelectorAll('.gantt-wrapper')` при загрузке
|
{% cut "Развернуть" %}

Если диаграмм несколько (несколько `.gantt-wrapper` на одной странице) — все инициализируются. Но **каждая** загружает `svg-pan-zoom` (одна загрузка, `window.svgPanZoom` уже есть). Ок.

Но если пользователь переключает вкладки (`{% list tabs %}`) и на скрытой вкладке тоже есть `.gantt-wrapper` — `svgPanZoom` инициализируется на `display: none`-элементе. Координаты нулевые, инициализация «успешна», но pan/zoom после показа вкладки может работать некорректно. Обработчик `document.click` на `.yfm-tab` через 100 мс вызывает `instance.resize()` — компенсирует.

{% endcut %}
||
||
KI-421
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`mermaid.client.js` — свой pan/zoom, без ограничений `svg-pan-zoom`
|
{% cut "Развернуть" %}

PlantUML: `svgPanZoom` с `minZoom: 0.05, maxZoom: 15, zoomScaleSensitivity: 0.2`.
Mermaid: `scale = Math.min(scale + 0.1, 5)` / `Math.max(scale - 0.1, 0.2)`.

Разные диапазоны (`0.05–15` vs `0.2–5`), разная чувствительность. UX-несоответствие между двумя диаграммами.

Плюс — Mermaid-pan/zoom через `svg.style.transform = 'translate(...) scale(...)'` (CSS-трансформация). При масштабировании SVG рендерится заново (может быть медленно для больших диаграмм). `svgPanZoom` оперирует `<g>`-группой без перерисовки.

{% endcut %}
||
||
KI-422
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`mermaid.client.js` — `MutationObserver` не отключается
|
{% cut "Развернуть" %}

<code>
const observer = new MutationObserver((_, obs) => {
    if (setupMermaidFeatures()) {
        obs.disconnect();
    }
});
observer.observe(parentBlock, { childList: true, subtree: true });
setTimeout(() => observer.disconnect(), 5000);
</code>

Отключается либо при успехе, либо через 5 секунд. Ок. Но если `setupMermaidFeatures` возвращает `false` каждые 5 секунд (Mermaid не рендерит) — до конца жизни страницы `MutationObserver` не активен (disconnect через 5 с). Пользователь видит статичную диаграмму, pan/zoom не работает.

{% endcut %}
||
||
KI-423
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`mermaid.client.js` — `window.open(url, '_blank')` — popup blocker
|
{% cut "Развернуть" %}

Если браузер блокирует popup, клик по узлу ничего не делает. Обычно `window.open` в обработчике клика — разрешено (user gesture), но при определённых настройках — может блокироваться. Никакого fallback (например, `window.location.href = url` для внутренних ссылок).

{% endcut %}
||
||
KI-424
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`setupClickableNodes` — `taskId` может не найтись
|
{% cut "Развернуть" %}

<code>
const selectors = [
    `#${taskId}`,
    `[id*="${taskId}"]`,
    `.task#${taskId}`,
    `[data-id="${taskId}"]`,
];
</code>

`taskId` — из `mapping` (id задачи, например `budget-planning`). Mermaid генерирует SVG с `id` для каждой задачи, но формат зависит от версии:

- Mermaid ≤ 9.x: `<rect id="budget-planning" …>`;
- Mermaid ≥ 10.x: внутренние id генерируются автоматически (`L-…`), `task.id` не сохраняется как DOM-id.

Если `taskId` не найден ни одним селектором — клик по узлу не работает. Диагностики нет. Пользователь видит `gantt-node-clickable` не на всех узлах.

{% endcut %}
||
||
KI-425
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.patcher.js` — `</body>` в одном регистре
|
{% cut "Развернуть" %}

<code>
const bodyCloseIndex = content.lastIndexOf('</body>');
</code>

Ищет **строго** `</body>`. Если HTML-шаблон отдаёт `</BODY>` (например, после minify) — не найдёт, `bodyCloseIndex === -1`, страница пропускается.

Аналогично в `mermaid.patcher.js` (`content.replace('</body>', …)`).

{% endcut %}
||
||
KI-426
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`findHtmlFiles` в `mermaid.patcher.js` дублирует `walkHtmlFiles` из `plantuml.patcher.js`
|
{% cut "Развернуть" %}

Одна и та же логика (рекурсивный обход `.html`), две реализации. Одна с колбэком, другая с массивом. Стоит вынести в `utils/walk`.

{% endcut %}
||
||
KI-427
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.patcher.js` — `getGanttRuntimeFixScrollScript()` читает файл на каждую страницу
|
{% cut "Развернуть" %}

<code>
function getGanttRuntimeFixScrollScript() {
    const scriptPath = path.resolve(__dirname, 'plantuml.client.js');
    return fs.readFileSync(scriptPath, 'utf-8');
}
</code>

Вызывается **на каждую страницу** с `gantt-raw-container`. Для 100 страниц — 100 чтений файла. Мелочь, но можно было бы прочитать один раз и кэшировать.

{% endcut %}
||
||
KI-428
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`mermaid.patcher.js` — `<style>` дублирует `roadmap.css`
|
{% cut "Развернуть" %}

В `wrapMermaidContainer` уже встроен `<style>` из `roadmap.css`. Патчер добавляет ещё `<style>` с **частью** правил (`.gantt-wrapper`, `.gantt-toolbar`, `.gantt-toggle-btn`, `.gantt-node-clickable`). Дублирование.

Причины неясны. Если `roadmap.css` надёжно встроен — дублирование избыточно. Если нет (например, генератор другой) — нужно.

{% endcut %}
||
||
KI-429
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.client.js` — `svgPanZoom` instance не сохраняется в переменной на уровне модуля
|
{% cut "Развернуть" %}

<code>
var panZoomInstance = svgPanZoom(svg, { … });
</code>

`panZoomInstance` — локальная в замыкании `(function (wrap) { … })(wrapper)`. На `resize` — `window.addEventListener('resize', function () { panZoomInstance.resize(); })` — замыкание срабатывает, работает. Но если пользователь переключит вкладку (и SVG «уйдёт» из DOM) — instance остаётся, `resize()` может выбросить ошибку (элемент отключён). Не критично.

{% endcut %}
||
||
KI-430
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`svg-pan-zoom@3.6.1` — старая версия (2020)
|
{% cut "Развернуть" %}

`3.6.1` — последняя стабильная на 2020. С тех пор библиотека не развивалась. Для базового pan/zoom — достаточно, но:

- нет поддержки `touch`-жестов (мобильные устройства);
- нет доступности (`aria-*`).

Для типичной документации — не критично, но если пользователь открывает с планшета — pan/zoom не работает.

{% endcut %}
||
||
KI-431
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`roadmap.patcher` и `roadmap` — engine не согласованы
|
{% cut "Развернуть" %}

`roadmap` генерирует с `CURRENT_ENGINE = PLANTUML` (по умолчанию) или `options.engine`.

`roadmap.patcher` обрабатывает с `options.engine` (из CLI — `MERMAID`).

Если пользователь **вручную** вызовет `generateRoadMap({ dataPath, engine: PLANTUML })`, а потом `docs-build.js` (который всегда `MERMAID`) — патчер применит Mermaid-патчер к PlantUML-разметке. На странице нет `js-gantt-mapping` (PlantUML её не создаёт), но **есть** `mermaid` — где? В `wrapSvgContainer` нет слова «mermaid», только `<svg>`. Значит `patchMermaid` **не** найдёт маркер. Итог: PlantUML-диаграмма останется **без** клиентского скрипта (ни PlantUML, ни Mermaid).

В стандартной сборке (`roadmap` через `docs-build.js`) это не проявляется, потому что `roadmap` тоже запускается с `MERMAID` (через CLI). Но если пользователь запускает `roadmap` отдельно — легко попасть в рассогласование.

{% endcut %}
||
||
KI-432
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`error.self` не применимо, `process.exitCode` не ставится
|
{% cut "Развернуть" %}

`patchPlantUml` и `patchMermaid` возвращают `void` (ничего). Не сигнализируют об ошибках. Если `findHtmlFiles` упал на нечитаемом каталоге (нет прав) — исключение уйдёт наружу, `runGeneration` не поймает, `process.exitCode` не установится. `docs-build.js` продолжит следующий шаг, как будто всё ок.

{% endcut %}
||
||
KI-433
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`plantuml.patcher.js` — `console.log('[PlantUML Patcher] Внедрен скриптPan/Zoom…')` — нет пробела
|
{% cut "Развернуть" %}

`«скриптPan/Zoom»` — слиплось. Мелочь, но в логах бросается в глаза.

{% endcut %}
||
||
KI-434
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
Опечатка `findHtmlFiles` в `mermaid.patcher.js` — без проверки `fs.existsSync(dir)`
|
{% cut "Развернуть" %}

<code>
function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    // …
}
</code>

Проверка есть. Ок.

{% endcut %}
||
||
KI-435
|
unknown
|
major
|
[`МодульПатчерГанта`](../МодульПатчерГанта/index.md)
|
`roadmap.patcher` не экспортирует `patchPlantUml` / `patchMermaid`
|
{% cut "Развернуть" %}

Только `runGeneration` и `generateGanttFixScroll` (alias). Если пользователю нужно принудительно применить конкретный патчер (например, для отладки) — только через `runGeneration({ engine: … })`.

Мелочь, но можно добавить в `module.exports`.

{% endcut %}
||
||
KI-436
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`isTypeChanged` сравнивает label с name
|
{% cut "Развернуть" %}

<code>
const currentSectionType = IndexMdEntryReadSectionType(oldFolderPath);   // 'Section'
const isTypeChanged = currentSectionType !== newSectionTypeObj.value;    // 'Раздел'
</code>

Никогда не равны (name vs label). `isTypeChanged` всегда `true` → `needSorting` всегда `true` → `sortTocItems` запускается при каждом переименовании, даже если тип и индекс не менялись.

Формально `sortTocItems` идемпотентна — если порядок уже правильный, файл перезаписывается с тем же содержимым. Но:

- лишняя работа на большом проекте (обход всех дочерних `index.md`);
- `toc.yaml` перезаписывается через `YAML.stringify` — форматирование может измениться (даже если семантически то же), diff в git шумный.

Правильно сравнивать `name` с `name`:

<code>
const isTypeChanged = currentSectionType !== newSectionTypeObj.name;   // 'Section' vs 'Section'
</code>

{% endcut %}
||
||
KI-437
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`TocYamlEntryUpdateOrAppend` вызывается с `finalFolderName = oldFolderName`
|
{% cut "Развернуть" %}

<code>
let finalFolderName = oldFolderName;

TocYamlEntryUpdateOrAppend(
    parentDir,
    oldFolderName,
    fullTitle,
    finalFolderName,  // = oldFolderName
    …
);
</code>

Функция пишет `href: oldFolderName/index.md`, `include.path: oldFolderName/toc.yaml`. Запись в `toc.yaml` родителя получает новый `name` (`fullTitle`), но **старые** `href`/`include.path`. Это корректно на момент вызова (папка ещё не переименована), но:

- если `DiplodocSectionPatch` упадёт (например, `fs.renameSync` бросит `EXDEV`), `href` остаётся `oldFolderName/index.md`, `name` — `fullTitle`. То есть `toc.yaml` **уже** содержит «неконсистентное» состояние: имя новое, папка старая;
- если `DiplodocSectionPatch` вернёт **старое** имя при ошибке (см. следующий пункт), но папка фактически переименована — `href` в `toc.yaml` останется старым, а папка будет новой.

Правильный подход — сначала переименовать папку и получить **фактическое** имя, потом обновлять `toc.yaml`. Или — использовать транзакционность (временная папка, откат при ошибке).

{% endcut %}
||
||
KI-438
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`DiplodocSectionPatch` возвращает старое имя при ошибке, но папка может быть уже переименована
|
{% cut "Развернуть" %}

<code>
try {
    fs.renameSync(folderPath, newFolderPath);                   // ← папка уже новая
    TocYamlEntryPatchReference(parentDir, oldFolderName, newFolderName);
    TocYamlEntryPatchTitle(newFolderPath, composedTitle);
    IndexYamlEntryPatch(newFolderPath, …);                      // ← если это упадёт…
    IndexMdUpsert(newFolderPath, …);
    return newFolderName;
} catch (err) {
    console.error(…);
    return oldFolderName;                                        // ← но вернём старое имя!
}
</code>

Если `fs.renameSync` успешен, но следующий шаг (`TocYamlEntryPatchReference` или `IndexYamlEntryPatch`) бросает — `catch` возвращает `oldFolderName`. В `ux_section_rename`:

<code>
finalFolderName = DiplodocSectionPatch(...);   // = oldFolderName
finalFolderName = path.basename(finalFolderName);  // = oldFolderName
// …
const effectiveNewPath = path.join(parentDir, finalFolderName);  // = oldFolderPath
await updateLinksAfterRename(oldFolderPath, oldFolderPath, projectRoot, …);  // ← no-op
</code>

Ссылки в проекте остаются указывать на `oldFolderPath`, но папка физически уже в `newFolderPath`. Сборка `@diplodoc/cli` упадёт на всех ссылках.

Правильно:

- при ошибке — попытаться откатить `fs.renameSync(newFolderPath, folderPath)` в `catch`;
- или вернуть `newFolderName` (папка уже переименована) и сообщить об ошибке на конкретном шаге, оставив пользователю право доделать вручную.

Сейчас — самое опасное место в модуле.

{% endcut %}
||
||
KI-439
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`TocYamlEntryPatchReference` — regex без экранирования
|
{% cut "Развернуть" %}

<code>
content = content.replace(new RegExp(oldFolderName, 'g'), newFolderName);
</code>

`oldFolderName` может содержать `.` (`Раздел1.Введение`), `(` `)` `[` `]` `+` `*` `?` `{` `}` (не должно, но `isValidName` их пропускает, а `TEMPLATE_FOLDER_NAME` вырезает только буквы/цифры — так что на практике только точки и дефисы). Из них `.` — метасимвол regex. `Раздел1.Введение` под regex матчит `Раздел1XВведение`, `Раздел1 Введение` и т.д.

Реальный сценарий: в `toc.yaml` родителя есть комментарий `# Раздел1XВведение — старый`, где `X` — любая буква, случайно попавшая под `.`. После замены станет `# Раздел2XНовое` — испорченный комментарий.

Более вероятно: `Раздел1.Введение` содержит `.`, и если в `toc.yaml` есть `# Раздел1_Введение` (с `_` вместо `.`) — regex **не** сматчит (`_` ≠ `.` в буквальном сравнении, но `.` в regex матчит `_`). То есть `# Раздел1_Введение` **будет** заменено на `# Раздел2_Новое`. Неверно.

Фикс — `escapeRegExp(oldFolderName)`:

<code>
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()&#124;[\]\\]/g, '\\$&');
}
content = content.replace(new RegExp(escapeRegExp(oldFolderName), 'g'), newFolderName);
</code>

{% endcut %}
||
||
KI-440
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`IndexYamlEntryPatchHRef` при `composedTitle = ''` опустошает `title`
|
{% cut "Развернуть" %}

<code>
// In TocYamlEntryPatchReference:
IndexYamlEntryPatchHRef(parentDir, oldFolderName, newFolderName, '');
</code>

<code>
// In IndexYamlEntryPatchHRef:
const selfRegex = new RegExp(`(\\s*-\\s+title:\\s*)([^32]+)(\\n\\s+href:\\s+)${oldFolderName}/index\\.md`, 'g');
content = content.replace(selfRegex, `$1${composedTitle}$3${newFolderName}/index.md`);
</code>

Если в `index.yaml` родителя есть запись вида:

<code>
- title: Старое название
  href: Раздел1.Введение/index.md
</code>

— она превратится в:

<code>
- title: 
  href: Раздел2.Новое/index.md
</code>

`title` опустеет. Формально `IndexYamlEntryPatchHRef` в `Rename` не имеет полного `composedTitle` (он не передан из `TocYamlEntryPatchReference`), но `IndexYamlEntryPatch` (другой шаг, для самой секции) уже установил `title` в `index.yaml` **внутри** секции. А этот — про `index.yaml` **родителя**, где может быть список детей.

В стандартной структуре Diplodoc `index.yaml` родителя не содержит списка детей (дети — в `toc.yaml`). Так что регексп `selfRegex` обычно не сматчит ничего — no-op. Но если пользователь вёл ручной список в `index.yaml` родителя — `title` опустеет.

{% endcut %}
||
||
KI-441
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`IndexYamlEntryPatchSection` (regex) не добавляет `pureTitle` если его нет
|
{% cut "Развернуть" %}

<code>
content = content.replace(/^pureTitle:.*/m, `pureTitle: ${pureTitle}`);
</code>

Если в `index.yaml` **нет** строки `pureTitle:` (пользователь создал статью без этого поля), regex не сматчит, строка не добавится. `index.yaml` останется без `pureTitle`. При следующем `Rename` (или `reindexer.directories`) это снова не добавится (regex не матчит).

Между тем `DiplodocSectionPatch` → `IndexYamlEntryPatch` (js-yaml) — **добавляет** `data.pureTitle = newPureTitle`. То есть после `Rename` со сменой папки `pureTitle` появится, а после `Rename` без смены папки — не появится. Несогласованность.

{% endcut %}
||
||
KI-442
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

`if (!uri) return;` — как и в других `section.*`. Команда видна в палитре, но не работает без выделения папки.

{% endcut %}
||
||
KI-443
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`promptSectionIndex` — `Escape` не отменяет
|
{% cut "Развернуть" %}

<code>
userIndex = (await promptSectionIndex(currentIndex)) ?? '';
</code>

Если пользователь нажал `Escape` — `userIndex = ''`, `finalIndex = ''`. `composeFolderName('', type, title)` → папка без индекса (`Раздел.Введение`). Пользователь ожидал отмены, получил «секцию без индекса».

Правильно:

<code>
const raw = await promptSectionIndex(currentIndex);
if (raw === undefined) return null;  // отмена
userIndex = raw;
</code>

{% endcut %}
||
||
KI-444
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`updateLinksAfterRename` вызывается даже когда папка не переименована
|
{% cut "Развернуть" %}

Если `newFolderName === oldFolderName` (только `pureTitle` изменился, а `sectionIndex` и `sectionType` — нет), `effectiveNewPath === effectiveOldPath`. `updateLinksAfterRename` обходит все `.md` в проекте, но `transform` для «своих» возвращает тот же путь → `updateLinksInContent` пересобирает ссылки с тем же относительным путём → `newContent === content` → файлы **не** перезаписываются.

То есть на выходе — ничего не меняется, но время потрачено. На проекте с тысячей `.md` — секунды. Стоит добавить проверку `if (effectiveOldPath !== effectiveNewPath) await updateLinksAfterRename(...)`.

{% endcut %}
||
||
KI-446
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`rename.error.interrupted` — только в консоль
|
{% cut "Развернуть" %}

<code>
if (!newSectionObject) {
    console.log(translate(nls_ts.plugin.section.rename.error.interrupted));
    return;
}
</code>

NLS: `"object will not be renamed: input cancelled"` (странная формулировка с `object` вместо «секция»). Пользователь, нажавший `Escape` на первом диалоге, не видит **никакого** сообщения — только `console.log` в Developer Tools расширения. UX-проблема.

Правильно — либо `showInformationMessage('Переименование отменено')`, либо ничего не логировать (отмена — нормальное действие).

{% endcut %}
||
||
KI-447
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
Сообщение об успехе повторяет имя, если оно не изменилось
|
{% cut "Развернуть" %}

Если только `pureTitle` изменилось (`Раздел1.Введение` → `Раздел1.Начало` — стоп, `newFolderName = 'Раздел1.Начало'`, папка переименуется). А если `pureTitle` не изменилось, а только `sectionType` (Section → Chapter с тем же `value`... нет, `value` разный — `Раздел` vs `Глава`) — папка переименуется.

Случай, когда папка **не** переименовывается — только «нажали Rename и подтвердили всё как было» (тип тот же, имя то же, индекс тот же). Тогда сообщение: `«Раздел переименован: «Раздел1.Введение» → «Раздел1.Введение»»` — странно.

Починка — проверять `oldFolderName === finalFolderName` и выводить «Раздел обновлён» без стрелки, либо перейти на `fullTitle` (текстовое название) в сообщении.

{% endcut %}
||
||
KI-448
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`needSorting` — сортировка всегда (из-за `isTypeChanged`)
|
{% cut "Развернуть" %}

Уже описано в первом пункте. Второй эффект: `sortTocItems(parentDir)` использует `IndexMdEntryReadIndex` для каждой дочерней секции. Если какая-то дочерняя секция была повреждена (`index.md` не имеет `sectionIndex`), она попадёт в `nonIndexed` и уедет в конец списка. Это «правильно» по дизайну `sortTocItems`, но если раньше в `toc.yaml` она стояла в середине — пользователь увидит неожиданное «переехало в конец» после переименования **другой** секции.

{% endcut %}
||
||
KI-450
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`IndexYamlEntryPatch` (js-yaml) и `IndexYamlEntryPatchSection` (regex) дают разный результат
|
{% cut "Развернуть" %}

В `DiplodocSectionPatch` используется `IndexYamlEntryPatch` (через js-yaml, полная перезапись). В `DiplodocSectionRefresh` — `IndexYamlEntryPatchSection` (regex, точечные правки).

После `Rename` со сменой папки — `index.yaml` переформатирован (потеря комментариев). После `Rename` без смены папки — сохранён (комментарии на месте). Несогласованность между двумя ветками.

Фикс — перейти на единый подход (regex везде или js-yaml везде). Regex — предпочтительнее (сохраняет комментарии).

{% endcut %}
||
||
KI-451
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
`TocYamlEntryUpdateOrAppend` обновляет только первую запись
|
{% cut "Развернуть" %}

Если в `toc.yaml` родителя запись на секцию встречается **дважды** (например, пользователь случайно продублировал), обновится только первый. Второй останется со старым `name`. После сборки — две ссылки на одну папку с разными названиями. Маловероятно, но возможно.

{% endcut %}
||
||
KI-452
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
Нет `withProgress` на `updateLinksAfterRename`
|
{% cut "Развернуть" %}

`await updateLinksAfterRename(...)` — обход всех `.md` без индикатора. На большом проекте — секунды «задумчивости» VS Code. Пользователь не понимает, что происходит.

{% endcut %}
||
||
KI-453
|
unknown
|
major
|
[`МодульПереименованиесекции`](../МодульПереименованиесекции/index.md)
|
Неатомарность и отсутствие rollback
|
{% cut "Развернуть" %}

Если `DiplodocSectionPatch` упадёт на середине — папка уже переименована, `index.md`/`index.yaml`/`toc.yaml` могут быть частично обновлены, `toc.yaml` родителя может содержать неконсистентные `name`/`href`. Откат — вручную.

Правильный подход — сохранять «снимок» файлов перед операцией, при ошибке — восстанавливать. Или — работать через временную папку: `fs.renameSync(old, old.tmp)` → правки → `fs.renameSync(old.tmp, new)`. Если что-то упало — `fs.renameSync(old.tmp, old)` возвращает исходное состояние.

Сейчас — нет.

{% endcut %}
||
||
KI-454
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`FrontMatterSectionTypesIndexed` включает `Page` — Page ошибочно получает индекс
|
{% cut "Развернуть" %}

В `model/frontmatter.model.js`:

<code>
const FrontMatterSectionTypesIndexed = [
    FrontMatterSectionTypes.PART,
    FrontMatterSectionTypes.SECTION,
    FrontMatterSectionTypes.CHAPTER,
    FrontMatterSectionTypes.PAGE,     // ← Page
];
</code>

`reindexAndRenameSection` использует **этот** список (не `Indexed2`), поэтому `Page` попадает в ветку «индексируется». `hadManualIndex = !!currentIndex` — у Page `currentIndex = ''`, `hadManualIndex = false`, `localCounter++`, `currentIndex = parentIndex.N`. То есть **статья получает индекс**.

Симптом: `index.md` статьи (`title: Введение`, без `sectionIndex`) после реиндексации получает `sectionIndex: '1'`, `title: Статья 1. Введение`, папка переименовывается в `1.Введение`.

Фикс — использовать `FrontMatterSectionTypesIndexed2` (без `Page`):

<code>
if (FrontMatterSectionTypesIndexed2.includes(sectionType)) { … }
</code>

Это одна строка.

{% endcut %}
||
||
KI-455
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`TocYamlEntryPatch` правит `tocDoc` в памяти, но `sortTocItems` перечитывает с диска
|
{% cut "Развернуть" %}

Порядок:

1. `reindexAndRenameSection` → `TocYamlEntryPatch(tocDoc, sectionName, newTitle)` — правит `tocDoc.name` в памяти.
2. `sortTocItems(dir, …)` — **заново** `TocYamlFileLoad(tocPath)` с диска. Правки `tocDoc` **теряются**.

То есть `name` в `toc.yaml` родителя **не обновляется** после переименования секции. Пользователь видит в `toc.yaml` старое имя (`Раздел1.Введение`), а папка уже `Раздел2.Архитектура`. При следующей сборке `@diplodoc/cli` покажет устаревшее имя.

Фикс — либо сохранять `tocDoc` перед `sortTocItems` (`TocYamlFileSave`), либо передавать `tocDoc` в `sortTocItems`.

{% endcut %}
||
||
KI-456
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`sortTocItems` вызывается **после** каждой рекурсии
|
{% cut "Развернуть" %}

Структура:

<code>
for (const section of sections) {
    const result = reindexAndRenameSection(...);
    const childWarnings = reindexDirectory(result.sectionPath, ...);   // рекурсия
    // ...
}
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);                            // сортировка
}
</code>

Сортировка — **после** всего цикла (включая рекурсию). То есть сначала обходятся все дети (с их сортировками), потом сортируется **этот** `toc.yaml`. Логически правильно, но:

- `reindexDirectory` возвращает после рекурсии — `tocDoc` родителя уже в памяти (с правками), но `sortTocItems` его не использует;
- каждая рекурсия делает свой `sortTocItems` для дочернего `toc.yaml`.

Итог: для дерева из 50 секций — 51 вызов `sortTocItems`, каждый читает+пишет `toc.yaml`. Медленно, но работает.

{% endcut %}
||
||
KI-457
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`localCounter` не сохраняется между рекурсиями
|
{% cut "Развернуть" %}

`localCounter` — локальная переменная в `reindexDirectory`. После обхода всех секций и рекурсии — не сохраняется нигде. При повторном вызове `reindexDirectory` на той же папке — начинается с 0.

Практически работает: `localCounter` используется только внутри одного вызова. Но если пользователь запускает реиндексацию дважды (например, отменил, потом снова), второй запуск пересчитает индексы с нуля, что может привести к другим номерам (если `metadata.sectionIndex` уже обновлён, `localCounter = max(localCounter, lastNum)` — правильно).

{% endcut %}
||
||
KI-458
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`DiplodocSectionPatch` возвращает старое имя при ошибке (та же проблема, что в `section.Rename`)
|
{% cut "Развернуть" %}

<code>
try {
    fs.renameSync(folderPath, newFolderPath);
    // … много правок …
    return newFolderName;
} catch (err) {
    console.error(`❌ Не удалось переименовать ${oldFolderName}:`, msg);
    return oldFolderName;
}
</code>

Если `fs.renameSync` успешен, но следующая правка бросит — `catch` вернёт **старое** имя, а папка уже переименована. `reindexDirectory` продолжит с `result.sectionPath = path.join(dir, oldFolderName)` — несуществующий путь. Рекурсия `reindexDirectory(result.sectionPath, …)` вызовет `fs.readdirSync` на несуществующем пути → `throw ENOENT`.

Симптом: реиндексация падает на середине с `ENOENT`, часть папок переименована, часть — нет, `toc.yaml` в неконсистентном состоянии.

Фикс — как в `section.Rename`: откат `fs.renameSync` при ошибке или возврат фактического имени.

{% endcut %}
||
||
KI-459
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`IndexMdUpsert` вызывается **до** `DiplodocSectionPatch`
|
{% cut "Развернуть" %}

<code>
IndexMdUpsert(oldSectionPath, pureTitle, sectionType, sectionLabel, currentIndex);
const newFolderName = DiplodocSectionPatch(oldSectionPath, pureTitle, sectionTypeObj, currentIndex);
</code>

`IndexMdUpsert` правит `index.md` по **старому** пути. Потом `DiplodocSectionPatch` переименовывает папку (с `index.md` внутри). Внутри `DiplodocSectionPatch` ещё раз вызывается `IndexMdUpsert` (по новому пути). То есть `index.md` правится **дважды** — второй раз перезаписывает первый. Лишняя работа, но не баг.

{% endcut %}
||
||
KI-460
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`warnings` не удаляются после показа
|
{% cut "Развернуть" %}

`ux_reindex_directories`:

<code>
if (allWarnings.length > 0) {
    showWarnings(allWarnings);
}
</code>

`showWarnings` показывает модальный диалог. После закрытия — `allWarnings` остаётся в переменной (не используется). При следующем вызове — новый пустой `allWarnings`. Не баг, но при отладке `console.log(allWarnings)` после — покажет старые.

{% endcut %}
||
||
KI-461
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`checkMissingSectionType` — пустой `sectionType` = `null`, а не `''`
|
{% cut "Развернуть" %}

<code>
function checkMissingSectionType(metadata, sectionPath, warnings) {
    if (!metadata.sectionType &#124;&#124; metadata.sectionType.trim() === '') {
        // …
    }
}
</code>

`metadata.sectionType = null` (из `getSectionMetadata`). `!null` → `true`, warning сработает. Правильно.

Но `metadata.sectionType.trim()` при `null` — `TypeError`. Не выполнится, потому что `!metadata.sectionType` — `true` (short-circuit). Ок.

{% endcut %}
||
||
KI-462
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`checkTitleHasPrefix` — только по префиксу
|
{% cut "Развернуть" %}

<code>
const prefixes = ['Часть', 'Раздел', 'Глава'];
for (const prefix of prefixes) {
    if (title.startsWith(prefix + ' ') &#124;&#124; title.startsWith(prefix + '.')) {
        warnings.push({ type: 'titleHasPrefix', … });
        break;
    }
}
</code>

Если `title` начинается с `Раздел 1. Введение` (есть пробел после `Раздел`) — сработает. Если `Раздел1.Введение` (без пробела) — **не сработает** (не начинается с `'Раздел '` или `'Раздел.'`). Пользователь не увидит warning, хотя `pureTitle` не извлечён и `DiplodocSectionPatch` будет использовать `basename` как `pureTitle`.

{% endcut %}
||
||
KI-463
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`sortTocItems` не вызывается, если `toc.yaml` не существует
|
{% cut "Развернуть" %}

<code>
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);
}
</code>

`tocDoc` — `null`, если `toc.yaml` нет. Секции переименуются, но порядок в родителе — «как был» (или, если `toc.yaml` не было, вообще не появится).

Если у родителя нет `toc.yaml`, но есть дети — это «невалидный» Diplodoc-проект. Модуль не падает, но и не создаёт `toc.yaml`.

{% endcut %}
||
||
KI-464
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
Нет CLI — только VS Code
|
{% cut "Развернуть" %}

`reindexDirectories` недоступен из командной строки. В `docs-build.js` его нет. Это интерактивная операция (нужно выбрать папку), но для CI (например, при деплое) автоматизация невозможна.

Можно было бы добавить `cli('reindexDirectories', '--docsDir', './docs/ru')` в `docs-build.js` (как `reindexFigures`), но это переиндексирует всю документацию при каждой сборке — возможно, не то, что хотят пользователи.

{% endcut %}
||
||
KI-465
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`showInformationMessage` — всегда «успех», даже с warnings
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(translate(nls_ts.plugin.section.reindex.info.success));
if (allWarnings.length > 0) showWarnings(allWarnings);
</code>

Сначала «Переиндексация завершена!», потом модальное с warnings. Пользователь видит «успех», а потом список проблем. Логичнее — сначала warnings (если есть), потом «успех» (или вместо). Или — одно сообщение с контекстом.

{% endcut %}
||
||
KI-466
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`reindexDirectory` не логирует число обработанных секций
|
{% cut "Развернуть" %}

Только `console.log` на каждую папку (`Переиндексация: <path>`) и на каждую секцию (`auto index <N> - <folder>` / `manual index <N>`). Для 50 секций — 100+ строк лога. Мелочь, но в DevTools Console шумно.

{% endcut %}
||
||
KI-467
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`getSectionMetadata` возвращает `sectionIndex: null`, `String(null &#124;&#124; '') = ''`
|
{% cut "Развернуть" %}

<code>
let currentIndex = String(metadata.sectionIndex &#124;&#124; '').trim();
</code>

`metadata.sectionIndex = null` → `null &#124;&#124; '' = ''` → `String('') = ''`. Правильно.

`metadata.sectionIndex = 0` (число) → `0 &#124;&#124; '' = ''` → `String('') = ''`. **Баг**: если `sectionIndex: 0` (число в frontmatter, что валидно для `Раздел 0`), `0 &#124;&#124; ''` даст `''`. Индекс потеряется, сработает auto-индексация (`1`, `2`, …). Секция с номером `0` превратится в `1`.

{% endcut %}
||
||
KI-468
|
unknown
|
major
|
[`МодульПереиндексацияпапок`](../МодульПереиндексацияпапок/index.md)
|
`metadata.pureTitle &#124;&#124; sectionName`
|
{% cut "Развернуть" %}

<code>
const pureTitle = metadata.pureTitle &#124;&#124; sectionName;
</code>

Если `pureTitle: ''` (пустая строка), fallback на `sectionName` (имя папки). Приемлемо, но `''` — валидный `pureTitle`? Скорее нет. `&#124;&#124;` не различает `''` и `null` — оба дадут `sectionName`.

{% endcut %}
||
||
KI-469
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
Только `ru` в `docs-build.js`
|
{% cut "Развернуть" %}

Как `reindexFootnotes` и `footnoteNumbering`. Для `en` — не вызывается. Английская документация сохранит исходную нумерацию.

{% endcut %}
||
||
KI-470
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
Регулярка `<figcaption>` — жёсткая по формату
|
{% cut "Развернуть" %}

<code>
const regex = /<figcaption\s+class="imageDescription"([^37]*?)\s+id="([^38]+)"([^37]*?)>([\s\S]*?)<\/figcaption>/gi;
</code>

Требует:

- `class="imageDescription"` — **до** `id` (порядок важен);
- двойные кавычки (не одинарные);
- `id` — сразу после `class` с пробелом.

Если пользователь напишет `<figcaption id="fig-1" class="imageDescription">` (id первым) — **не сработает**. Аналогично `<figcaption class='imageDescription' id='fig-1'>` (одинарные кавычки) — **не сработает**.

`figures.extractor` использует такой же regex — совпадёт поведение.

{% endcut %}
||
||
KI-471
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`uniqueKey` — path-specific
|
{% cut "Развернуть" %}

`mapping.set(uniqueKey, counter)`, где `uniqueKey = ${path.resolve(mdFilePath)}::${id}`. Если одна и та же картинка referenced из двух файлов с **одинаковым** `id="fig-foo"` — два разных ключа, каждый получит свой номер. Это правильно для нумерации подписей, но:

- если пользователь скопировал `<figure>` из статьи A в статью B (с тем же `id`), обе подписи получат **разные** номера (правильно);
- но `mapping` **не предупреждает** о дубликатах. Если `id` одинаковый — при `#fig-foo` в ссылке из статьи C **непонятно**, в какую из двух подписей ведёт ссылка. При этом `updateFigureLinksInFile` резолвит от `targetMdPath` (путь целевого `.md`), так что если `pathPart` в ссылке указывает на A — попадёт в A, на B — в B. Работает.

{% endcut %}
||
||
KI-472
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`updateFigureLinksInFile` — только `[text](path#fig-…)`
|
{% cut "Развернуть" %}

Regex:

<code>
const linkRegex = /\[([^39]]+)\]\(([^40]*?)(#fig-[^40]+)\)/g;
</code>

Только markdown-ссылки. **Не** находит:

- `<a href="…#fig-…">`;
- reference-style `[text][ref]` + `[ref]: url#fig-…`;
- `<figcaption>` в исходнике (это не ссылка, а определение).

Если пользователь ссылается на рисунок через `<a>` — номер не обновится.

{% endcut %}
||
||
KI-473
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`updateFigureLinksInFile` — только `#fig-…`
|
{% cut "Развернуть" %}

`#fig-` — префикс `id` (из `buildFigureId`). Если пользователь создал `<figure>` вручную с `id="my-figure"` (без `fig-`) — ссылка `[text](path#my-figure)` **не** будет обновлена. `pass 1` тоже не тронет — regex требует `id="…"` (без `#`), но `pass 2` требует `#fig-`. Расхождение.

{% endcut %}
||
||
KI-474
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`template.replace('{0}', ...)` — только первое вхождение
|
{% cut "Развернуть" %}

<code>
const newLinkText = template.replace('{0}', (newNumber ?? '').toString());
</code>

`String.prototype.replace` с строкой-паттерном заменяет **первое** вхождение. Если в `figureReferenceCaptionPrefix` несколько `{0}` (что странно, но возможно) — заменится только первое.

{% endcut %}
||
||
KI-475
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`innerText` — только первый уровень форматирования
|
{% cut "Развернуть" %}

<code>
const formatPatterns = [
    { regex: /^(\*{1,2})(.*?)\1$/, wrapper: '$1' },
    { regex: /^(_{1,2})(.*?)\1$/, wrapper: '$1' },
];
</code>

Разбирает `*text*`, `**text**`, `_text_`, `__text__`. **Не** разбирает:

- `***bold italic***` (три звёздочки);
- `*text with **bold** inside*` (вложенное форматирование);
- markdown-ссылки внутри `linkText` (например, `[см. [раздел]](…)`).

`innerText` используется только для определения `рис`/`fig` — если внутри `linkText` есть эти слова, но в обрамлении другого формата — шаблон не распознается.

{% endcut %}
||
||
KI-476
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`pass 1` — `captionText` захватывает `[\s\S]*?`
|
{% cut "Развернуть" %}

`([\s\S]*?)` — любой текст, включая переносы строк. Если внутри `<figcaption>` есть `<strong>` или markdown — они сохранятся как есть. Но:

- `cleaned` = `captionText.replace(/^(Рисунок&#124;Figure&#124;Fig\.&#124;Рис\.)\s*\d+\.?\s*/i, '').replace(/^\d+\.\s*/, '').trim()` — только **первый** префикс удаляется. Если в подписи `Рисунок 1. Рисунок 2. Текст` (двойной) — удалится первый, второй останется.
- `trim()` — обрезает пробелы в начале/конце.

{% endcut %}
||
||
KI-477
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`figureCounter` — глобальный, но `pass 1` не идемпотентна
|
{% cut "Развернуть" %}

Повторный запуск `reindexFigures` пересчитает с `figureCounter = 1`, но номера уже правильные — `changed` не сработает (если номера не изменились). Идемпотентна по результату, но **не** по логу (`console.log('+N рис.')` при каждом запуске, даже если ничего не изменилось).

{% endcut %}
||
||
KI-478
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`targetLocale !== activeLocale` → жёстко `«Figure»`
|
{% cut "Развернуть" %}

<code>
function GetPrefixOrDefault(config, activeLocale, targetLocale) {
    return activeLocale !== targetLocale ? 'Figure' : config.figureCaptionPrefix &#124;&#124; 'Figure';
}
</code>

Если пользователь в настройках `figureCaptionPrefix: «Рисунок»` (для `ru`), но передал `targetLocale: 'en'` — получит `«Figure»`. Логика: «если язык не совпадает с активным, использовать английский». Не баг, но негибко.

{% endcut %}
||
||
KI-479
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`DiplodocConfigFromJson(configJsonOrObj)` — две разные реализации
|
{% cut "Развернуть" %}

В `reindexer.figures.js` импорт:

<code>
const { DiplodocConfigFromJson } = require('../manifest/config/diplodoc.config');
</code>

В `manifest/config/diplodoc.config.js`:

<code>
function DiplodocConfigFromJson(json) {
    if (typeof json === 'string') {
        try { return JSON.parse(json); } catch (err) { … }
    } else if (json && typeof json === 'object') {
        return { ...DefaultDiplodocConfig(), ...json };
    }
    return DefaultDiplodocConfig();
}
</code>

Для **строки** — `JSON.parse` (без `DefaultDiplodocConfig` merge). Для **объекта** — merge с default. Значит, если config приходит как строка (из env `CLI_CONFIG`), поля без явного значения останутся `undefined` — `GetPrefixOrDefault` использует fallback.

Работает, но тонко.

{% endcut %}
||
||
KI-480
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`updateFigureLinksInFile` — не пишет `console.log` при обновлении
|
{% cut "Развернуть" %}

Комментарий в коде:

<code>
// if (updated) {
//     fs.writeFileSync(filePath, newContent, 'utf8');
//     // console.log(`Обновлены ссылки в ${path.relative(process.cwd(), filePath)}`);
// }
</code>

`console.log` закомментирован. При отладке непонятно, **какие** файлы обновлены. Только суммарное `Готово. Всего пронумеровано: N`.

{% endcut %}
||
||
KI-481
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`rootDir` — не проверяется
|
{% cut "Развернуть" %}

`fs.readFileSync(mdFilePath)` в `pass 1` и `pass 2`. Если `.md` удалён между `collectMdFilesInOrder` и `readFileSync` (race condition) — `throw`, `catch` ловит, `console.error`. Файл пропускается, но остальные обрабатываются.

{% endcut %}
||
||
KI-482
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
`success: false` в `reindexFigures` при отсутствии `toc.yaml`
|
{% cut "Развернуть" %}

`{ success: false, reason: 'no_toc' }`. VS Code покажет `showWarningMessage`. Но `reindexFigures` **не** создаёт `toc.yaml` (это ответственность `@diplodoc/cli`/пользователя). Если пользователь удалил `toc.yaml` вручную — придётся восстанавливать из git.

{% endcut %}
||
||
KI-483
|
unknown
|
major
|
[`МодульПереиндексациярисунков`](../МодульПереиндексациярисунков/index.md)
|
Нет CLI-опции для `--locale` / `--config`
|
{% cut "Развернуть" %}

`targetLocale` и `configObj` берутся из `process.env.CLI_LOCALE` / `process.env.CLI_CONFIG` (через `DiplodocConfigFromCli`). Если пользователь хочет явно `--locale en` — только через env. Несогласовано с `--docsDir` / `--outputDir` (которые через аргументы).

{% endcut %}
||
||
KI-484
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`FrontMatterSectionTypesIndexed` включает `Page` — Page ошибочно учитывается
|
{% cut "Развернуть" %}

<code>
if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
</code>

`FrontMatterSectionTypesIndexed = [Part, Section, Chapter, Page]`. `Page` — статья, у неё **нет** `sectionIndex` (`''` по определению). Проверка `&& sectionIndex` отсекает `Page` — потому что `sectionIndex === ''` (falsy). Так что **на практике** `Page` не учитывается.

Но если кто-то вручную поставит `sectionIndex: '5'` в статье (`sectionType: 'Page'`) — статья попадёт в `siblingIndices`, следующий `sectionIndex` станет `6`. «Фантомный» индекс.

Правильно — использовать `FrontMatterSectionTypesIndexed2` (без `Page`).

{% endcut %}
||
||
KI-485
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
Не учитывает дочерние секции второго уровня
|
{% cut "Развернуть" %}

`calculateNextIndex` смотрит только на **прямых** детей `targetDir`. Если `targetDir = docs/ru/` содержит:
- `Раздел1.Введение/` (`sectionIndex: '1'`), **и**
- `Раздел1.Введение/Глава1/` (`sectionIndex: '1.1'`),

— второй уровень **не** учитывается (обход `targetDir` только на один уровень). Это правильно для `parentIndex = ''` (дети первого уровня `[1]` → следующий `2`), но если пользователь создаёт **первую** главу в `Раздел1.Введение`, `maxIdx` берётся из `targetDir`-детей (только `Раздел1.Введение` с индексом `1`), а надо было бы из `Раздел1.Введение`-детей (пусто → `maxIdx = 0`).

Стоп — `targetDir = docs/ru/Раздел1.Введение`, `parentIndex = '1'`, обход детей `targetDir` (пусто), `maxIdx = 0`, возврат `'1.1'`. Правильно.

А если `targetDir = docs/ru/`, `parentIndex = ''`, обход детей `docs/ru/` (там `Раздел1` с `'1'`), `maxIdx = 1`, возврат `'2'`. Тоже правильно.

Глубже — работает, потому что каждый вызов идёт от **своего** родителя. Логика корректна.

{% endcut %}
||
||
KI-486
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`maxIdx` — последняя часть, не полная
|
{% cut "Развернуть" %}

<code>
const parts = sectionIndex.split('.');
const lastPart = parts[parts.length - 1];
const lastNum = parseInt(lastPart, 10);
</code>

Для `sectionIndex = '2.5'` — `lastNum = 5`. Для `sectionIndex = '2.5.3'` — `lastNum = 3`.

Если у детей **разные** уровни (например, `2.5` и `2.5.3` в одной папке — что нетипично, но возможно), `maxIdx = max(5, 3) = 5`. Следующий `2.5.6`? Нет, `2.6` — потому что `lastNum` берётся как «последний в строке», а не как «элемент того же уровня».

Это **баг для смешанных уровней**: если в `targetDir` есть `2.5` и `2.5.3`, ожидаемый следующий — `2.6` (по уровню), а не `2.5.6`. Работает «случайно» — если дети одного уровня (типичный случай), всё ок.

{% endcut %}
||
||
KI-487
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`parentIndex === ''` — `'1'` (не `'0'`)
|
{% cut "Развернуть" %}

<code>
if (!fs.existsSync(parentIndexPath)) return '1';
</code>

Если `targetDir` — корень языка (`docs/ru/` без `index.md` — норм для Diplodoc), `parentIndex = '1'` жёстко. Но если пользователь создаёт **вторую** секцию в `docs/ru/` (первая уже есть), `parentIndexPath = docs/ru/index.md` **существует**? Нет, обычно нет. Значит, `return '1'` — **не** `'2'`. Первая секция уже `'1'`, следующая тоже `'1'` — **коллизия**.

Стоп — `section.Create` (Фаза 2):

<code>
const hasIndex = FrontMatterSectionTypesIndexed2.includes(sectionType.name);
const sectionIndexCalculated = calculateNextIndex(targetDir);
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
</code>

Если `targetDir = docs/ru/`, `calculateNextIndex` вернёт `'1'` (потому что `index.md` нет). Но если `docs/ru/Раздел1.Введение` уже существует с `sectionIndex: '1'`, `calculateNextIndex` **должен** вернуть `'2'`. А вернёт `'1'` (из-за раннего `return '1'`).

**Критический баг**: на корне языка `calculateNextIndex` **всегда** возвращает `'1'`. Не учитывает существующих детей. Пользователь получает предложение `'1'`, конфликтует с существующей секцией, `createSectionFolder` бросит «Путь уже существует».

Правильный код:

<code>
let parentIndex = '';
if (fs.existsSync(parentIndexPath)) {
    const parentContent = fs.readFileSync(parentIndexPath, 'utf8');
    parentIndex = String(get(parentContent, 'sectionIndex') &#124;&#124; '');
}
// … обход детей (без early return) …
</code>

То есть `parentIndex = ''` при отсутствии `index.md`, **но** обход детей всё равно выполняется.

{% endcut %}
||
||
KI-488
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`parseInt` без `radix`
|
{% cut "Развернуть" %}

<code>
const lastNum = parseInt(lastPart, 10);
</code>

Radix указан (`10`) — хорошо. Но `parseInt('05')` = `5`, `parseInt('5abc')` = `5`. Если `sectionIndex: '2.5abc'` (опечатка) — `lastNum = 5`, не диагностируется.

{% endcut %}
||
||
KI-489
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`get` возвращает `null` при отсутствии
|
{% cut "Развернуть" %}

`get(content, 'sectionType')` — `null` если нет. `FrontMatterSectionTypesIndexed.includes(null)` — `false`. Правильно (пропуск).

`get(content, 'sectionIndex')` — `null`. `String(null &#124;&#124; '') = ''`. Проверка `&& sectionIndex` — `false` (пустая строка falsy). Пропуск.

{% endcut %}
||
||
KI-490
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`reduce((a, b) => Math.max(a, b), 0)` — но это `maxIdx`
|
{% cut "Развернуть" %}

`Math.max(...siblingIndices)` не используется из-за риска `spread` на большом массиве. `reduce` — надёжнее. Мелочь, но правильно.

{% endcut %}
||
||
KI-491
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`parentIndex` не trim
|
{% cut "Развернуть" %}

<code>
const parentIndex = String(get(parentContent, 'sectionIndex') &#124;&#124; '');
</code>

Если `sectionIndex: '  2  '` (пробелы) — `parentIndex = '  2  '`. `return \`${parentIndex}.${nextSubNumber}\`` → `'  2  .3'`. Кривой индекс.

Фикс — `.trim()`.

{% endcut %}
||
||
KI-492
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
Нет обработки ошибок `fs.readdirSync`
|
{% cut "Развернуть" %}

`fs.readdirSync(targetDir, { withFileTypes: true })` — если `targetDir` не существует или нет прав — `throw`. Внешний `try/catch` — нет. Исключение уйдёт в `section.Create`, где **есть** `try/catch` (в Фазе 5), но с общим сообщением `«Критическая ошибка: …»`.

{% endcut %}
||
||
KI-493
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
Дублирование логики с `reindexer.directories`
|
{% cut "Развернуть" %}

`reindexer.directories` использует **свой** `localCounter++` для auto-индексации. `reindexer.md` вычисляет `maxIdx + 1` — по сути **то же самое**, но по-другому.

- `reindexer.directories` — `localCounter` инкрементируется по мере обхода детей (в порядке `readdirSync`);
- `reindexer.md` — обходит всех детей, находит максимум, прибавляет 1.

Результат одинаковый, если у детей **последовательные** индексы (`1, 2, 3`). Если у детей **пропуски** (`1, 3, 5`):
- `reindexer.directories` даст `6` (max = 5 → 6);
- `reindexer.md` даст `6` (max = 5 → 6).

Если порядок детей `[3, 1, 2]` (неотсортированный `readdirSync`):
- `reindexer.directories` — `localCounter = max(0, 3) = 3` → `4`;
- `reindexer.md` — `maxIdx = 3` → `4`.

Совпадает. Дублирование — не баг, но maintenance: правка в одном — надо править в другом.

{% endcut %}
||
||
KI-494
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`reindexer.md` не в `module.exports` CLI
|
{% cut "Развернуть" %}

`src/plugins/diplodoc-helper-cli.js` — `module.exports` содержит `reindexFigures`, `reindexFootnotes`, но **не** `reindexer.md` (это не команда). Логично.

{% endcut %}
||
||
KI-495
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`sectionIndex` не поддерживает буквенные префиксы
|
{% cut "Развернуть" %}

`parseInt('a5')` = `NaN` — пропуск. Если `sectionIndex: 'a.5'` (что валидно? нет, но пользователь может), не учитывается. Стандарт Diplodoc — только цифры.

{% endcut %}
||
||
KI-496
|
unknown
|
major
|
[`МодульПереиндексациястатей`](../МодульПереиндексациястатей/index.md)
|
`IndexYaml` / `toc.yaml` не читаются
|
{% cut "Развернуть" %}

`calculateNextIndex` читает только `index.md`. Если `toc.yaml` содержит запись с `sectionIndex`, но в `index.md` его нет (рассинхронизация) — модуль не увидит. Правильно (source of truth — `index.md`), но при повреждённом проекте — сюрприз.

{% endcut %}
||
||
KI-497
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
Перемещение в корень языка невозможно
|
{% cut "Развернуть" %}

`collectMoveTargets(languageRoot)` начинает `walk(languageRoot)` — с **детей** корня. Сам `languageRoot` (например, `docs/ru/`) в список **не попадает**.

То есть переместить секцию из `docs/ru/Раздел1/` наверх, в `docs/ru/` — нельзя. Пользователь увидит список секций, но не «корень языка». Единственный способ — перетащить вручную (без обновления ссылок) и починить `toc.yaml` руками.

Починка — добавить `languageRoot` в начало списка в `selectTargetDirectory`:

<code>
const targets = [
    { path: languageRoot, label: '(корень языка)', level: 0 },
    ...(await collectMoveTargets(languageRoot)),
];
</code>

{% endcut %}
||
||
KI-498
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`getComposedTitle` читает `title:` регуляркой
|
{% cut "Развернуть" %}

<code>
const titleMatch = content.match(/title:\s*(.+)/);
</code>

Первое совпадение `title:` в файле, **без** ограничения на frontmatter. Если в теле статьи есть пример YAML с `title: …` и frontmatter **не** имеет `title:` (только `pureTitle:`) — регулярка поймает `title:` из примера. Результат: `name` в `toc.yaml` станет строкой из примера кода.

Использовать `gray-matter` (через `parse`) — правильно, но модуль не использует. Дополнительная проблема: если в frontmatter есть `meta.title: …` (в `index.yaml`-формате), регулярка всё равно ищет `title:`, но `meta.title` идёт после `title:` обычно — совпадение будет на `title:` (правильное). Но если `title:` нет, а есть только `meta.title:` — регулярка поймает `meta.title:` (потому что `title:` внутри `meta.title:` — подстрока). Результат: `name` = `'…'` из `meta.title`, но без `meta.` префикса.

{% endcut %}
||
||
KI-499
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`getComposedTitle` fallback — имя папки
|
{% cut "Развернуть" %}

<code>
return titleMatch ? titleMatch[1].trim() : path.basename(sectionPath);
</code>

Если `title:` нет (только `pureTitle:`) — `name` в `toc.yaml` станет `path.basename(sectionPath)` (например, `Раздел1.Введение` без пробела). На странице пользователь увидит «Раздел1.Введение» вместо «Раздел 1. Введение».

Fallback должен быть `pureTitle` (если есть) или `title`, а не `basename`. Проблема редкая (обычно `title` есть), но заметная на «грязных» секциях.

{% endcut %}
||
||
KI-500
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
Порядок операций при `!isSameParent` не атомарен
|
{% cut "Развернуть" %}

Четыре шага:

1. `TocYamlEntryRemove` — удалили из старого родителя.
2. `fs.renameSync` — перенесли папку.
3. `updateLinksAfterRename` — обновили ссылки.
4. `TocYamlEntryInsertAtPosition` — добавили в нового родителя.

Если **шаг 2** (`fs.renameSync`) упадёт (кросс-диск, нет прав) — шаг 1 уже выполнен. Раздел «пропал» из навигации (запись в `toc.yaml` старого родителя удалена), но папка на месте. `catch` в `ux_section_move` ловит, показывает `«Ошибка перемещения: …»`. Пользователь получает раздел в исходной папке, но не в `toc.yaml`.

Если **шаг 3** (`updateLinksAfterRename`) упадёт — шаг 4 не выполнится. Раздел в новой папке, ссылки в старом состоянии, `toc.yaml` нового родителя без записи.

Если **шаг 4** (`TocYamlEntryInsertAtPosition`) упадёт — раздел в новой папке, ссылки обновлены, но `toc.yaml` без записи. На странице пользователь раздел не увидит.

Правильный порядок — «сначала файлы, потом `toc.yaml`», и атомарность через временную папку: перенести в `targetPath.tmp`, обновить ссылки, переименовать `targetPath.tmp` → `targetPath`, обновить `toc.yaml`. Модуль этого не делает.

{% endcut %}
||
||
KI-502
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`updateLinksAfterRename` обходит **все** `.md` в проекте, включая перемещённый раздел
|
{% cut "Развернуть" %}

`updateLinksInProject(projectRoot, transform, stubText)` — `findFiles(projectRoot, '.md')` вернёт `.md` и внутри перемещённого раздела. Для ссылок **внутри** раздела на **файлы того же раздела** `transform` вернёт `newPath`, но относительный путь **не изменится** (оба файла переехали вместе). `updateLinksInContent` пересчитает путь и запишет то же самое — лишняя работа, но не ошибка.

Для ссылок из раздела **на внешние файлы** — относительный путь **изменится** (глубина вложенности другая). Например, из `Раздел1/foo.md` на `common/bar.md` — путь `../common/bar.md`. После перемещения `Раздел1` в `Раздел2/Раздел1` — `../../common/bar.md`. `updateLinksInContent` корректно пересчитает.

То есть **это** `section.Move` обновляет правильно — в отличие от `section.Delete` (где обход внутри раздела приводит к порче).

{% endcut %}
||
||
KI-504
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`TocYamlEntryInsertAtPosition` при `after` — тихий fallback
|
{% cut "Развернуть" %}

<code>
if (targetIndex !== -1) {
    tocData.items.splice(targetIndex + 1, 0, newEntry);
} else {
    tocData.items.push(newEntry);
}
</code>

Если `afterName` не найден в `tocData.items` (например, `afterName` ссылается на запись, которая была удалена между QuickPick и `InsertAtPosition` — теоретически возможно при параллельном редактировании), запись добавляется **в конец**. Пользователь выбрал «После: Раздел1.Введение», а раздел появился в конце `toc.yaml`. Молча.

Правильно — бросить ошибку или предупредить.

{% endcut %}
||
||
KI-505
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`error.self` — мёртвый NLS-ключ
|
{% cut "Развернуть" %}

В `package.nls.json`:

<code>on
"plugin.section.move.error.self": "Нельзя переместить раздел в самого себя."
</code>

Но в коде `error.self` **не используется**. Проверка на «переместить в себя»:

<code>
if (isSameParent && position.position === 'after' && position.afterName === sourceName) {
    vscode.window.showWarningMessage(translate(nls_ts.plugin.section.move.warning.samePosition, sourceName));
    return false;
}
</code>

Это про «сменить позицию на текущую» — предупреждение `warning.samePosition`. А «переместить в папку самого себя» (например, `Раздел1` → `Раздел1/Подраздел`) — проверяется через `error.recursive`:

<code>
if (!isSameParent && targetPath.startsWith(sourcePath + path.sep)) { … error.recursive … }
</code>

То есть оба случая покрыты, но разными ключами. `error.self` — мёртвый.

{% endcut %}
||
||
KI-506
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`updateLinksAfterRename` с `stubText = '**удалено**'` — вводит в заблуждение
|
{% cut "Развернуть" %}

В `performMove`:

<code>
await updateLinksAfterRename(sourcePath, targetPath, projectRoot, '**удалено**');
</code>

Но `transform` в `updateLinksAfterRename` возвращает **только** `newPath` (для ссылок на перемещённое) или `undefined` (для всех остальных). `stubText` используется только если `transform` вернёт `null` — то есть никогда. Параметр — мёртвый в этой функции.

Формулировка `'**удалено**'` сбивает с толку при чтении кода — кажется, что ссылки на перемещённое будут заменены на заглушку. Нет, будут пересчитаны на новый путь. См. `updateLinksAfterDelete` — **там** `stubText` реально работает.

{% endcut %}
||
||
KI-507
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`selectTargetDirectory` — `matchOnDescription: true` бесполезен
|
{% cut "Развернуть" %}

<code>
const items = targets.map(t => ({
    label: '  '.repeat(t.level) + t.label,
    description: t.path,
    targetPath: t.path,
}));

const selected = await vscode.window.showQuickPick(items, {
    placeHolder: translate(nls_ts.plugin.section.move.placeholder.targetfolder),
    matchOnDescription: true,
});
</code>

`description: t.path` — полный абсолютный путь. При поиске в QuickPick пользователь набирает «Введение», QuickPick ищет по `label` и `description`. По `description` — по абсолютному пути, что совпадает почти всегда (все пути начинаются с `C:\…` или `/home/…`). Фильтрация по `description` даёт шум: пользователь набирает «foo», и в списке остаются все, у кого в пути есть «foo».

`matchOnDescription: true` имеет смысл, когда `description` короткий и семантичный (например, `'module'`, `'article'`). Здесь — абсолютный путь, бесполезно.

{% endcut %}
||
||
KI-509
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`fs.renameSync` — кросс-диск не поддерживается
|
{% cut "Развернуть" %}

`fs.renameSync` работает только в пределах одной файловой системы. Если `docs/ru/` на SSD, а `build/` (или `docs/en/`) на HDD — `renameSync` бросит `EXDEV: cross-device link not permitted`. `catch` в `ux_section_move` поймает, покажет `«Ошибка перемещения: EXDEV …»`.

Правильно — `fs.renameSync` + fallback на `fs.cpSync` + `fs.rmSync` при `EXDEV`. Но в контексте одного проекта это редкий сценарий. Плюс — в `isSameParent` проверка `oldParentDir === newParentDir` ловит **только** прямых братьев; если пути разные, но на одной ФС (например, `docs/ru/Раздел1/` → `docs/ru/Раздел2/`) — `renameSync` работает.

{% endcut %}
||
||
KI-510
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`fs.existsSync(targetPath)` — проверка на любую папку, не только секцию
|
{% cut "Развернуть" %}

<code>
if (!isSameParent && fs.existsSync(targetPath)) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.section.move.error.sectionexists, sourceName));
    return false;
}
</code>

Если в `targetDir` есть **пустая** папка `Раздел1.Введение` (или папка без `index.md`), `fs.existsSync` вернёт `true` — ошибка `«В целевой папке уже существует раздел "Раздел1.Введение"»`. Хотя это не «раздел», а просто папка. Пользователь не может переместить раздел туда, где лежит «пустышка».

Правильно — проверять `isDiplodocSection(targetPath)`. Если это «пустышка» — либо удалить её и переместить, либо спросить пользователя «Перезаписать?».

{% endcut %}
||
||
KI-511
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`references` не собираются
|
{% cut "Развернуть" %}

В отличие от [`section.Delete`](../МодульУдалениесекции/index.md), `section.Move` **не** собирает `references` заранее. Это правильно: при перемещении ссылки не удаляются, а пересчитываются. Но если в проекте тысячи `.md` — обход для `updateLinksAfterRename` занимает секунды, и пользователь ждёт без индикатора прогресса (нет `withProgress`). См. следующий пункт.

{% endcut %}
||
||
KI-512
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
Нет `withProgress`
|
{% cut "Развернуть" %}

Обновление ссылок на большом проекте (1000+ `.md`) — секунды. `await updateLinksAfterRename(...)` блокирует UI без индикатора. VS Code показывает «задумчивость» расширения, пользователь не понимает, что происходит.

Починка — обернуть в `withProgress({ title: 'Обновление ссылок…', cancellable: false }, ...)`.

{% endcut %}
||
||
KI-513
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
Сообщение об успехе содержит `sourceName`, а не число ссылок
|
{% cut "Развернуть" %}

NLS-ключ `plugin.section.move.info.success`: `"Обновлено ссылок в {0} файлах"`. В коде:

<code>
vscode.window.showInformationMessage(translate(nls_ts.plugin.section.move.info.success, sourceName));
</code>

`{0}` = `sourceName` (имя папки), а не число. Итог: `«Обновлено ссылок в Раздел1.Введение файлах»` — грамматически неверно и семантически ложно.

Правильно — передавать число файлов, где были замены. Но `updateLinksAfterRename` не возвращает число. Значит, либо менять сигнатуру, либо менять NLS-сообщение на `«Раздел "<name>" перемещён»`.

{% endcut %}
||
||
KI-514
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

Как и в `section.Create`/`section.Delete`. `if (!uri) return;` — без сообщения.

{% endcut %}
||
||
KI-515
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`isSameParent` — `getComposedTitle` вызывается **после** проверок
|
{% cut "Развернуть" %}

<code>
console.log(`[Move] Изменение позиции внутри одного родителя для: ${sourceName}`);
const composedTitle = await getComposedTitle(sourcePath);
TocYamlEntryMoveWithinSameFile(newParentDir, composedTitle, sourceName, position);
</code>

`getComposedTitle` — `async`, но `performMove` — тоже `async`, `await` стоит. Функция читает `index.md` целиком ради одного regex-совпадения. Мелочь, но если `isSameParent` — вся работа сводится к перестановке записи в `toc.yaml`. Можно было бы взять `name` из существующей записи в `toc.yaml` (не пересчитывать), но `TocYamlEntryMoveWithinSameFile` требует `composedTitle`, потому что переписывает `name` в `movingEntry`. Логика: «пересчитать name из index.md, чтобы оно соответствовало актуальному состоянию».

Если пользователь менял `title` в `index.md` вручную (без `Rename`), то `Move` это «подхватит» и обновит `name` в `toc.yaml`. Побочный эффект — приятный.

{% endcut %}
||
||
KI-516
|
unknown
|
major
|
[`МодульПеремещениесекции`](../МодульПеремещениесекции/index.md)
|
`TocYamlEntryMoveWithinSameFile` — не проверяет `movingEntry` на `null`
|
{% cut "Развернуть" %}

<code>
const [movingEntry] = tocData.items.splice(currentIndex, 1);
if (currentIndex === -1) { console.error(…); return; }
</code>

Стоп, порядок в коде:

<code>
const currentIndex = tocData.items.findIndex(...);
if (currentIndex === -1) {
    console.error('❌ Элемент не найден в текущем TOC для перемещения');
    return;
}
const [movingEntry] = tocData.items.splice(currentIndex, 1);
</code>

Проверка `currentIndex === -1` **до** `splice` — правильно. Если не найден — `console.error` и `return`. Но `return` без модификации файла: `toc.yaml` остаётся как был. Пользователь видит `«Ошибка перемещения: …»` (внешний catch не сработает, потому что `return`, а не `throw`). То есть `performMove` возвращает `true`, `ux_section_move` показывает `«Перемещено»`, а на деле — ничего не произошло.

Реальный сценарий: `TocYamlEntryRemove` при `!isSameParent` уже удалил запись, а `TocYamlEntryInsertAtPosition` — добавляет. Для `isSameParent` `TocYamlEntryMoveWithinSameFile` ищет запись по `sourceName` — она должна быть, потому что родитель тот же. Но если пользователь вручную правил `toc.yaml` и запись пропала — модуль не найдёт, ошибка уйдёт в `console.error`, `return` без `throw`, «успех» на экране.

{% endcut %}
||
||
KI-517
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`injectContainerIntoState` не вызывается
|
{% cut "Развернуть" %}

В `Pagebuilder.Config.FootnoteList.js` есть функция `injectContainerIntoState(html)`:

<code>
json.data.html += '\n<div id="footnotes-container"></div>';
return html.replace(stateRe, `$1${JSON.stringify(json)}$3`);
</code>

Она должна добавлять `<div id="footnotes-container">` в `diplodoc-state`, чтобы контейнер существовал ещё до hydrate. **Но её никто не вызывает** — ни `injectFootnoteList`, ни CLI, ни `docs-build.js`. Функция экспортируется? Нет — только `injectFootnoteList` в `module.exports`. Так что `injectContainerIntoState` — мёртвый код.

Практический эффект: контейнер создаётся клиентом (`ensureContainer`), и работает это за счёт `MutationObserver`. Если бы `injectContainerIntoState` вызывался, `tick()` сработал бы сразу, без 15-секундного polling'а. Как есть — при неудаче `@diplodoc/cli` отрендерить `.dc-doc-page__body` (например, в шаблоне изменился класс), страница с перечнем будет пустой.

{% endcut %}
||
||
KI-518
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`generateFootnoteListPage` не существует
|
{% cut "Развернуть" %}

В `generateNavigationContent.js`:

<code>
} else if (command === 'footnoteList') {
    generateFootnoteListPage({ docsDir, outputDir, lang: 'ru', langPrefix: 'ru' });
}
</code>

Но в `Pagebuilder.Config.FootnoteList.js` **нет** функции `generateFootnoteListPage` — там только `injectFootnoteList`. Импорт в `generateNavigationContent.js`:

<code>
const { generateFootnoteListPage } = require('./Pagebuilder.Config.FootnoteList');
// → undefined
</code>

Если кто-то вызовет `generateNavigationContent({ command: 'footnoteList', … })`, получит `TypeError: generateFootnoteListPage is not a function`.

К счастью, **это не путь CLI**: `diplodoc-helper-cli.js` для `footnoteList` вызывает `injectFootnoteList` напрямую:

<code>
} else if (command === 'footnoteList') {
    // …resolves targetHtml…
    const { injectFootnoteList } = require('./contentNavigator/Pagebuilder.Config.FootnoteList.js');
    const r = injectFootnoteList({ docsDir, targetHtml, langPrefix });
}
</code>

`generateNavigationContent.js` — отдельная точка входа (`runGeneration({ command })`), которая, судя по всему, не используется в текущей сборке. Но код, который в ней есть для `footnoteList`, нерабочий.

{% endcut %}
||
||
KI-519
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`footnoteList` не «оживляет» уже отрисованную таблицу — нет обновления при `MutationObserver`
|
{% cut "Развернуть" %}

Клиент `footnoteList.js`:

<code>
function tick() {
    var c = ensureContainer();
    if (!c) return false;
    if (!c.querySelector('.footnote-table')) renderTable();
    return true;
}
</code>

`MutationObserver` подписан на `document.body` и при **любом** изменении проверяет `if (!document.getElementById('footnotes-container')) tick()`. То есть если контейнер **есть** (например, Diplodoc сам его отрисовал), но таблица ещё не построена — `tick()` не сработает, потому что контейнер уже есть. `renderTable()` вызывается только в `tick()`. То есть `MutationObserver` не запускает рендер при изменениях.

Практически: контейнер обычно создаётся `ensureContainer` в первом `tick()` — то есть до `MutationObserver`. Повторный рендер не нужен. Но если Diplodoc перезапишет контейнер (например, при навигации по `#`-якорю внутри страницы), таблица пропадёт, и `MutationObserver` её не восстановит.

{% endcut %}
||
||
KI-520
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`--section` ищет **только** папку с точным именем
|
{% cut "Развернуть" %}

`findSectionIndexHtml(outputDir, sectionName)`:

<code>
if (e.name.toLowerCase() === sectionName.toLowerCase()) {
    const indexHtml = path.join(full, 'index.html');
    if (fs.existsSync(indexHtml)) return indexHtml;
}
</code>

Поиск по точному имени папки, без учёта регистра. Если у пользователя папка называется `Переченьсносок`, а `--section` передан как `ПереченьСносок` — сработает. Если `Перечень сносок` (с пробелом) или `Перечень_сносок` — не найдёт. Молча: `process.exitCode = 1` с сообщением `[footnoteList] Секция "…" не найдена`.

{% endcut %}
||
||
KI-521
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`urlPrefix` не кодируется
|
{% cut "Развернуть" %}

<code>
let urlPrefix = path.relative(targetDir, buildRoot).replace(/\\/g, '/');
if (urlPrefix && !urlPrefix.endsWith('/')) urlPrefix += '/';
</code>

`path.relative` даёт `../../..`. Но если в пути к целевой странице есть кириллица (`Дополнительнаяинформация/Переченьсносок`), то при обратном построении URL в `collectFootnotes`:

<code>
const url = `${urlPrefix}${prefixWithLang}${rel}`;
</code>

`rel` = `path.relative(docsDir, file).replace('.md', '.html')` — тоже может содержать кириллицу. Итоговый `url` попадает в `footnoteList.data.js` **без** `encodeURI`. Браузер при рендере `<a href="…кириллица…">` сделает percent-encoding сам, но в `JSON` это выглядит «как есть», и `refUrl` с `#fnrefN` тоже.

Работает, потому что браузер нормализует. Но если кто-то читает `footnoteList.data.js` программно (или копирует `href` в curl), нужно помнить: URL не закодирован.

{% endcut %}
||
||
KI-522
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`stripLinks` удаляет **все** ссылки
|
{% cut "Развернуть" %}

И серверный, и клиентский `stripLinks` вырезают `<a>`, `![…](…)` и `[…](…)`. То есть если в определении сноски была ссылка на статью, в таблице останется только текст без ссылки. Пример:

<code>
[^44]: См. [раздел «Установка»](../Установка/index.md).
</code>

В `footnoteList.data.js` текст будет `См. раздел «Установка».` — без ссылки.

Возможно, это намеренно (в таблице сносок не нужна вложенная навигация), но не описано ни в одном комментарии к коду. Если захочешь сохранять ссылки — придётся расширить `stripLinks` (оставлять `[text](url)` → `<a href>`), но это потребует клиентского рендера с санитайзером (как в `gosts`).

{% endcut %}
||
||
KI-523
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`langPrefix` из CLI — эвристика
|
{% cut "Развернуть" %}

<code>
const lastSeg = path.basename(path.resolve(docsDir));
const langPrefix = /^[a-z]{2}$/i.test(lastSeg) ? lastSeg : null;
</code>

Если пользователь передал `--docsDir ./docs/ru/` — `basename` даст `ru`, `langPrefix = 'ru'`. Если `--docsDir ./docs/` (корень, не язык) — `langPrefix = null`, и `url` в данных будет без языкового сегмента (`../../../Модули/…`), а не `../../../ru/Модули/…`. Это может «сработать» (если сайт собирается без языковых подпапок), но по умолчанию в Diplodoc языковые подпапки есть — так что `--docsDir` должен указывать на корень языка.

{% endcut %}
||
||
KI-524
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
Порядок сносок определяется `toc.yaml`, но не «физическим» порядком в файле
|
{% cut "Развернуть" %}

`collectFootnotes` идёт по `collectMdFilesByToc(docsDir)`, а не по физическому порядку. Если сноски в статье идут `[^43]` перед `[^44]` (пользователь вручную переставил), глобальные номера присвоятся по порядку появления ссылок в тексте (первая встреча — номер 1), а не по исходному `id`. Это согласуется с `footnotes` (pre), где нумерация тоже по порядку появления ссылок, но **не** согласуется с ручным `id` в `.md`. То есть `[^43]` в исходнике может стать `#1` в таблице — это норма для сквозной нумерации.

{% endcut %}
||
||
KI-525
|
unknown
|
major
|
[`МодульПереченьсносок`](../МодульПереченьсносок/index.md)
|
`footnoteList` не экспортируется из `diplodoc-helper-cli.js`
|
{% cut "Развернуть" %}

В `module.exports` файла `diplodoc-helper-cli.js`:

<code>
module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    // ...
    // generateFootnoteList отсутствует
};
</code>

Как и `helptags`, модуль доступен только через CLI-команду, но не через программный `require('diplodoc-helper-cli').generateFootnoteList`. Для внешних интеграций (кто-то хочет встроить вызов) это неудобно.

{% endcut %}
||
||
KI-526
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
Средний размер считается по `.md`, а не по HTML
|
{% cut "Развернуть" %}

`helpMap` кладёт в JSON поле `size` = размер **исходного `.md`-файла**. `bytescounter` использует именно его для `avgSize` и `getArticleStatus`. Если статья насыщена таблицами, `{% cut %}`, `{% list tabs %}` — её HTML-версия в 3–10 раз больше `.md`, но в отчёте она будет выглядеть «маленькой».

Внутренняя консистентность соблюдается (все статьи сравниваются по `.md`), но при обсуждении с командой «почему у нас средний размер 8 КБ» — надо помнить, что это про исходники, а не про то, что видит пользователь.

{% endcut %}
||
||
KI-527
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
«Глава» и «Раздел» — эвристика по имени папки
|
{% cut "Развернуть" %}

`parseUrlParts(url)` ищет префиксы `Раздел` / `Глава` в сегментах URL. То есть папка должна начинаться с «Раздел 1 …» / «Глава 3 …» (или `Раздел1…` без пробела — `getSectionNumber` / `getChapterNumber` ищут `^Раздел(\d+)` в `sectionName` без учёта пробела).

Если у пользователя папки называются по-другому (`Часть 1`, `Section A`, `01_Введение`), `sectionName` / `chapterName` будут `null`, все статьи попадут в `«Без раздела»` / `«Без главы»`. Диагностики нет — таблица отрендерится, но вся структура «схлопнется» в одну колонку «Без раздела» и одну строку «Без главы».

{% endcut %}
||
||
KI-528
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`Pagebuilder.common` — общий, но не экспортируется как «библиотека»
|
{% cut "Развернуть" %}

Функции `buildMatrix`, `buildSectionsMap`, `getArticleStatus`, `generateGenericTableFromArticles` лежат в `Pagebuilder.common.js` и экспортируются:

<code>
module.exports = { generateGenericTableFromArticles, buildMatrix };
</code>

Только `buildMatrix` и `generateGenericTableFromArticles`. Внутренние `buildSectionsMap`, `getArticleStatus`, `parseUrlParts`, `renderFile` не экспортируются — расширить «поведение» снаружи нельзя. Если понадобится `bytescounter` для нестандартного проекта (другие префиксы папок), придётся либо форкнуть модуль, либо расширить экспорт.

{% endcut %}
||
||
KI-529
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
Цвет статуса захардкожен в трёх местах
|
{% cut "Развернуть" %}

`status → colorClass` определяется в:

- `Pagebuilder.Config.Bytescounter.js` — `LEGEND_ITEMS` (для легенды);
- `bytescounter.js` — `colorMap` (для клиента);
- `core-renderer.js` — `renderStatusCell` (fallback `colorMap`, не используется для `bytescounter`, но есть).

Если поменять цвета (например, `color-excess` → `color-red`), надо править CSS, `LEGEND_ITEMS` и `colorMap` — три места вместо одного.

{% endcut %}
||
||
KI-530
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`periodicTable` — имя CLI-команды, не совпадает с модулем
|
{% cut "Развернуть" %}

Команда `periodicTable` генерирует `bytescounter.html`. Логично было бы назвать `bytescounter`, но `periodicTable` — историческое имя. В `docs-build.js` тоже `cli('periodicTable')`. При поиске «как сгенерировать bytescounter» пользователь может не догадаться, что команда называется иначе.

{% endcut %}
||
||
KI-531
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`navLinks` дублируются между отчётами
|
{% cut "Развернуть" %}

У `bytescounter`:

<code>
navLinks: [
    { label: 'Контексты', url: 'contextmap.html' },
    { label: 'Хелптаги', url: 'helptagmap.html' },
]
</code>

У `contextmap`:

<code>
navLinks: [
    { label: 'Хэлптэги', url: 'helptagmap.html' },
    { label: 'Размеры', url: 'bytescounter.html' },
]
</code>

У `helptagmap`:

<code>
navLinks: [
    { label: 'Размеры', url: 'bytescounter.html' },
    { label: 'Контексты', url: 'contextmap.html' },
]
</code>

Три раза одно и то же с разным порядком и формулировками («Хелптаги» vs «Хэлптэги»). Если добавится четвёртый отчёт — надо будет править все четыре места. Стоит вынести в общий констант (`CONTENT_NAV_LINKS`), но это уже рефакторинг.

{% endcut %}
||
||
KI-532
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`lang: ["ru", "en"]` — захардкожено
|
{% cut "Развернуть" %}

В `generateBytesCounterPage` вызов:

<code>
generateGenericTableFromArticles({ …, lang: ['ru', 'en'], … });
</code>

CLI-команда `periodicTable` не принимает `--langs`. Если в проекте только `ru` — `en`-половина будет пустой (`totalArticles: 0`, «Нет статей для этого языка»). Если появится третий язык (`de`) — нужно править код.

{% endcut %}
||
||
KI-533
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`core-renderer` читает `preferredLang` из `localStorage`
|
{% cut "Развернуть" %}

<code>
const savedLang = localStorage.getItem('preferredLang');
</code>

Ключ `preferredLang` — общий для всех отчётов (`bytescounter`, `contextmap`, `helptagmap`). Если пользователь переключился на `en` в `bytescounter`, а потом открыл `contextmap` — там тоже будет `en`. Хорошо для консистентности, но неочевидно: пользователь не ждёт, что выбор языка «перетекает» между страницами. Если `en`-данных в `contextmap` нет (`totalArticles: 0`), пользователь увидит «No articles for this language», хотя `ru`-данные есть.

{% endcut %}
||
||
KI-534
|
unknown
|
major
|
[`МодульРазмерыстатей`](../МодульРазмерыстатей/index.md)
|
`stripLinks` в `footnoteList` и `bytescounter` — разные
|
{% cut "Развернуть" %}

Не баг этого модуля, но при отладке стоит помнить: `contentNavigator`-модули не используют общий `stripLinks`. У `bytescounter` его вообще нет (он работает только с `title`, `size`, `url`), у `footnoteList` — свой. Единого подхода в семействе нет.

{% endcut %}
||
||
KI-535
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`docs-build.js` — `tocCleanMode` в фазе `pre` (критический баг)
|
{% cut "Развернуть" %}

<code>
pre: [
    run('clean build', …),
    cli('reindexFigures', '--docsDir', './docs/ru'),
    cli('reindexFootnotes', '--docsDir', './docs/ru'),
    cli('helpMap'),
    cli('tocCleanMode'),    // ← ЗДЕСЬ. На пустом build/.
    cli('periodicStat'),
    …
],
</code>

`injectCleanMode` вызывается **до** `@diplodoc/cli`. На пустом `build/` (после `clean build`) — `files = []`, ничего не инжектится. `@diplodoc/cli` создаёт HTML, но скрипт **не** встроен.

**Режим не работает** при стандартной сборке через `docs-build.js`.

Правильно — перенести в `post:`, после `@diplodoc/cli`:

<code>
post: [
    cli('footnoteAnchors', './build'),
    …
    cli('breadcrumb', './build'),
    cli('contexttags', './build'),
    cli('tocCleanMode', '--outputDir', './build'),    // ← здесь
    cli('ganttFixScroll', './build'),
    …
]
</code>

Одна правка в `docs-build.js`.

{% endcut %}
||
||
KI-536
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
Нет идемпотентности
|
{% cut "Развернуть" %}

`injectCleanMode` вставляет `<script>` перед `</body>` **всегда**. При повторном запуске (например, в watch-режиме или после ручной правки build/) — скрипт дублируется. На странице — 2, 3, N копий клиентского скрипта. Каждый выполнится: `hideNavigation` N раз, N `MutationObserver`, N × 5 `setTimeout`. Работает, но неаккуратно.

Фикс — маркер `id="dl-clean-mode"`:

<code>
if (content.includes('id="dl-clean-mode"')) return;
content = content.replace('</body>', `<script id="dl-clean-mode">${cleanScript}</script>\n</body>`);
</code>

{% endcut %}
||
||
KI-538
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`sessionStorage` может бросить
|
{% cut "Развернуть" %}

<code>
sessionStorage.setItem('diplodoc_clean_mode', 'true');
</code>

В `private browsing` (Firefox) или в `iframe` с ограничениями `sandbox` без `allow-same-origin` — `SecurityError`. Не поймано → скрипт падает, `hideNavigation` не вызывается.

Фикс:

<code>
try { sessionStorage.setItem(…); } catch { /* fallback: без сохранения */ }
</code>

{% endcut %}
||
||
KI-539
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`[class*="sidebar"]` — слишком широкий селектор
|
{% cut "Развернуть" %}

<code>
document.querySelectorAll('.dc-sidebar, .dc-doc-layout__sidebar, [class*="sidebar"]')
    .forEach(el => (el.style.display = 'none'));
</code>

`[class*="sidebar"]` находит **любой** элемент с `sidebar` в `class`. Если в статье есть пример кода `<div class="my-sidebar-example">…</div>` — он **тоже** скроется. В clean mode пользователь не увидит свой пример.

Аналогично `[class*="breadcrumb"]` — скроет примеры с `breadcrumb` в class.

Правильно — только Diplodoc-классы (`.dc-sidebar`, `.dc-doc-layout__sidebar`), без `[class*="…"]`.

{% endcut %}
||
||
KI-540
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`setTimeout × 5` — избыточно
|
{% cut "Развернуть" %}

Пять вызовов с интервалами (0, 300, 700, 1200, 2000). Плюс `MutationObserver` — который реагирует на **любое** изменение DOM. То есть после первого DOM-изменения (например, Diplodoc дописывает что-то) `hideNavigation` вызывается ещё раз. Итого — многократные вызовы без ясной необходимости.

Для типичной страницы достаточно: 1 × `hideNavigation()` (сразу) + 1 × `MutationObserver`. `setTimeout` не нужны.

Но — с `setTimeout` защита от «Diplodoc дописывает навигацию через 500 мс после загрузки». `MutationObserver` тоже сработает, но `hideNavigation` может выполниться **до** того, как `MutationObserver` настроен (если DOM-изменение произошло между `hideNavigation()` и `observer.observe(...)` — окно ~5 мс). `setTimeout` перекрывает.

Практически: 5 вызовов + `MutationObserver` — избыточно, но работает. Стоило бы оставить 1–2 `setTimeout`.

{% endcut %}
||
||
KI-541
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`MutationObserver` без отключения
|
{% cut "Развернуть" %}

`observer.observe(document.body, { childList: true, subtree: true })` — подписка на всё DOM. При большом числе изменений (переключение вкладок, анимации) — `hideNavigation` вызывается **на каждую мутацию**. Скрытие навигации — идемпотентно (`style.cssText = …` перезаписывает то же), но лишние вычисления.

Не критично для типичной страницы, но при активном DOM — заметно.

{% endcut %}
||
||
KI-542
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`console.log` в проде
|
{% cut "Развернуть" %}

<code>
console.log('[Diplodoc Clean Mode] Activated');
console.log('[Diplodoc Clean Mode] Persistent mode enabled');
</code>

Видны пользователю в DevTools. Для «чистого» режима, который встраивается в iframe, эти сообщения видны в родительском приложении (если оно открывает DevTools). Лучше убрать или обернуть в `if (window.location.search.includes('debug'))`.

{% endcut %}
||
||
KI-543
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`hideNavigation` использует `cssText` (перезаписывает всё)
|
{% cut "Развернуть" %}

<code>
el.style.cssText = `visibility: hidden !important; width: 0 !important; …`;
</code>

**Перезаписывает** все inline-стили элемента. Если Diplodoc поставил какой-то `style` на `.dc-doc-layout__left` (например, `transition: …` для анимации), он **потеряется**.

Альтернатива — `el.style.setProperty('width', '0', 'important')` для каждого свойства. Или — класс `.clean-mode-hidden`, у которого `!important`-правила в отдельном `<style>`.

Но `cssText` — самый быстрый и не требует отдельного `<style>`. Работает, но агрессивно.

{% endcut %}
||
||
KI-544
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`urlParams.has('clean')` — не различает `?clean` и `?clean=0`
|
{% cut "Развернуть" %}

`urlParams.has('clean')` → `true` для `?clean`, `?clean=`, `?clean=0`, `?clean=1`, `?clean=abc`. То есть `?clean=0` **включает** режим (см. выше). Правильно было бы:

<code>
const cleanValue = urlParams.get('clean');
const hasCleanParam = (cleanValue === '' &#124;&#124; cleanValue === '1' &#124;&#124; cleanValue === 'true') &#124;&#124; urlParams.get('mode') === 'embed';
</code>

Или — `cleanValue !== '0' && cleanValue !== 'false'`.

{% endcut %}
||
||
KI-545
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`sessionStorage` ключ `diplodoc_clean_mode` — глобальный для домена
|
{% cut "Развернуть" %}

Один ключ на всё доменное имя. Если у пользователя на `docs.example.com` открыты две вкладки — обе в clean mode (если одна установила). Или — `localStorage` был бы лучше для «сохранения между визитами», но это не то поведение, что здесь задумано (clean mode — «временный»).

{% endcut %}
||
||
KI-546
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`injectCleanMode` не проверяет, что `files.length > 0`
|
{% cut "Развернуть" %}

`console.log('[tocInject] Процесс завершён.')` — без счётчика. Если `buildDir` пуст (см. баг в `docs-build.js`) — лог `«Процесс завершён»` без индикации «0 файлов обработано».

{% endcut %}
||
||
KI-547
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`console.log` с префиксом `[tocInject]` — не `[CleanMode]`
|
{% cut "Развернуть" %}

<code>
console.log(`[tocInject] Процесс завершён.`);
</code>

Префикс `tocInject`, а не `tocCleanMode` / `[CleanMode]`. Косметика, но при поиске в логах по `CleanMode` — не найдётся.

{% endcut %}
||
||
KI-548
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`walk` без `fs.existsSync(dir)`
|
{% cut "Развернуть" %}

<code>
function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(…);
}
</code>

Если `buildDir` не существует — `fs.readdirSync` бросит `ENOENT`. `injectCleanMode` не ловит. В `docs-build.js` — `clean build` вызывается раньше, но если пользователь запускает `injectCleanMode` вручную на несуществующем каталоге — `throw`.

{% endcut %}
||
||
KI-549
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`sessionStorage` не изолирует поддомены
|
{% cut "Развернуть" %}

Если документация на `docs.example.com`, а приложение на `app.example.com` — `sessionStorage` **изолирован** по origin. Переход между `docs.example.com` и `app.example.com` не сохранит clean mode. Для встраивания через `iframe` это нормально (iframe с `docs.example.com` — свой origin), но если пользователь кликает на внешнюю ссылку в документации и возвращается — clean mode сбросится (потому что возврат — новый origin).

{% endcut %}
||
||
KI-550
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`tocCleanMode` не документирован в CLI-командах пользователя
|
{% cut "Развернуть" %}

`diplodoc-helper.tocCleanMode` — не VS Code-команда, не видна в палитре. Пользователь должен знать, что `?clean=1` — это фича расширения (а не Diplodoc). Ни в `README.md`, ни в `CHANGELOG.md` упоминания `tocCleanMode` / `?clean=1` **нет** (по крайней мере, в той части, которую я видел). При standalone-публикации модуля — это недокументированная фича.

{% endcut %}
||
||
KI-551
|
unknown
|
major
|
[`МодульРежимбезнавигации`](../МодульРежимбезнавигации/index.md)
|
`injectCleanMode` не читает конфиг
|
{% cut "Развернуть" %}

Ни `--clean-params`, ни `--disable`. Всегда инжектит. Если пользователь **не** хочет clean mode — только `--skip=tocCleanMode`.

{% endcut %}
||
||
KI-552
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`.vscode/launch.json → preLaunchTask: "Watch (for Debugging)"` — таск не существует
|
{% cut "Развернуть" %}

`.vscode/launch.json`:

<code>on
"preLaunchTask": "Watch (for Debugging)"
</code>

`.vscode/tasks.json`:

<code>on
{
    "label": "Watch (for Debugging)",
    "type": "shell",
    "command": "npm run watch",
    …
}
</code>

`npm run watch` — но в `package.json → scripts` **нет** `watch`. При попытке дебага (F5) — VS Code запустит `npm run watch` → `npm ERR! Missing script: "watch"`. Watch не запустится, `dist/extension.js` не обновится.

**Фикс** — добавить в `package.json`:

<code>on
"watch": "node build.js --watch"
</code>

Одна строка.

{% endcut %}
||
||
KI-553
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`process.exit(1)` — немедленный выход
|
{% cut "Развернуть" %}

<code>
catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
}
</code>

`process.exit(1)` — немедленный. Не даёт cleanup-обработчикам (например, `process.on('exit')`) выполниться. В watch-режиме — не критично (пользователь Ctrl+C). В обычной сборке — ок.

Правильно — `process.exitCode = 1; return;`.

{% endcut %}
||
||
KI-554
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`Watch mode (development with sourcemaps) started...` — всегда «development»
|
{% cut "Развернуть" %}

<code>
if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watch mode (development with sourcemaps) started...');
}
</code>

`console.log` всегда пишет «development», даже если `--watch --prod`. `buildOptions` для production (minify: true, sourcemap: false) — корректны, но лог врёт. Пользователь запускает `node build.js --watch --prod`, видит «development with sourcemaps» — сбивает с толку.

{% endcut %}
||
||
KI-555
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`fs.statSync('dist/extension.js')` — без try/catch
|
{% cut "Развернуть" %}

<code>
const size = (fs.statSync('dist/extension.js').size / 1024).toFixed(2);
</code>

Если esbuild вернул `undefined` (ошибка, которую не поймали — маловероятно, `esbuild.build` бросает) — `fs.statSync` бросит `ENOENT`. Внешний `catch` поймает, `console.error`, `process.exit(1)`. Работает.

{% endcut %}
||
||
KI-556
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`sourcemap` и `sourcesContent` — `!isProduction`
|
{% cut "Развернуть" %}

В production — `sourcemap: false`, `sourcesContent: false`. То есть `dist/extension.js` **без** `.map`. Если пользователь открывает `.vsix` в DevTools и хочет отладку — не сможет.

Это **осознанное** решение (production — минифицированный файл, sourcemap не нужен). Но при отладке **в production** (что редко) — неудобно.

{% endcut %}
||
||
KI-557
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`minify: isProduction` — не `minifySyntax`/`minifyIdentifiers` отдельно
|
{% cut "Развернуть" %}

`minify: true` — минифицирует **всё** (синтаксис, идентификаторы, whitespace). Для расширения VS Code это нормально. Но:

- `minifyIdentifiers` ломает `Function.prototype.name` (используется редко);
- `minifySyntax` ломает `debugger` (удаляет его, но это ок).

Для типичного расширения — ок.

{% endcut %}
||
||
KI-558
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`treeShaking: true` — но `bundle: true` уже включает
|
{% cut "Развернуть" %}

`esbuild` с `bundle: true` уже делает tree-shaking (по умолчанию). `treeShaking: true` — явное указание, но не влияет. Мелочь.

{% endcut %}
||
||
KI-559
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`logLevel: 'info'` — `info` и `warn` в stdout
|
{% cut "Развернуть" %}

`esbuild` пишет `info`-сообщения (какие файлы, размер). В CI — ок. В обычной сборке — шумно. `logLevel: 'warning'` — только предупреждения.

{% endcut %}
||
||
KI-560
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`isWatch` не отключает `isProduction`
|
{% cut "Развернуть" %}

`node build.js --watch --prod` — watch + production. `buildOptions` — minify, без sourcemap. Watch будет пересобирать production-бандл при каждом изменении. Работает, но медленнее (minification).

Правильно — либо запретить комбинацию (`if (isWatch && isProduction) { console.warn('watch в prod-режиме — медленно'); }`), либо документировать.

{% endcut %}
||
||
KI-561
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`buildOptions.sourcemap = !isProduction` — в dev `true`
|
{% cut "Развернуть" %}

`dist/extension.js.map` — в dev. VS Code через `launch.json → sourceMaps: true` — отладка по `src/`. Работает.

Но `outFiles: ["${workspaceFolder}/dist/**/*.js"]` — VS Code ищет `.js.map` в `dist/`. Он есть. Ок.

{% endcut %}
||
||
KI-562
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`fs.mkdirSync('dist', { recursive: true })` — до `try`
|
{% cut "Развернуть" %}

<code>
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

try { … }
</code>

Если `mkdirSync` бросит (например, нет прав) — `throw` **до** `try/catch`. Пользователь увидит `Uncaught Error: EACCES` без «Build failed». Мелочь.

{% endcut %}
||
||
KI-563
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`entryPoints: ['src/extension.js']` — единственная точка
|
{% cut "Развернуть" %}

`src/extension.js` — точка входа. **Все** остальные файлы (`src/commands/*`, `src/plugins/*`) — достижимы через `require` из `extension.js`. Если какой-то файл **не** импортируется — не попадёт в `dist/` (tree-shaking, если экспорт не используется).

Проверка: `src/pasteProvider.js` (пустой) — не импортируется нигде. **Не** попадает в `dist/`. Это ожидаемо (пустой файл), но стоит помнить: «мусорные» файлы не батчатся.

{% endcut %}
||
||
KI-564
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`NODE_ENV=production` vs `--prod`
|
{% cut "Развернуть" %}

`isProduction = process.env.NODE_ENV === 'production' &#124;&#124; process.argv.includes('--prod')`. То есть `NODE_ENV=production` **или** `--prod`.

В `package.json → build:prod` — `cross-env NODE_ENV=production`. То есть через env. `--prod` — альтернатива (для ручного запуска).

Оба работают. Но если пользователь запустит `NODE_ENV=production node build.js` (без `--prod`) — тоже production. `isProduction` — `true` (env). Ок.

Если пользователь запустит `NODE_ENV=development node build.js --prod` — `isProduction = ('development' === 'production') &#124;&#124; true = true`. Production. `--prod` перевешивает. Ок.

{% endcut %}
||
||
KI-565
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`console.log('Watch mode ...')` — блокирует завершение `build()`
|
{% cut "Развернуть" %}

`await ctx.watch()` резолвится **сразу** после старта (не ждёт первого пересчёта). `console.log` — после. `build()` завершается. Процесс **не** выходит (esbuild держит handle).

Пользователь видит «Watch mode started...», а первый `dist/extension.js` появляется через **N** мс (после первого пересчёта). Если пользователь сразу открывает VS Code (F5) — `dist/` может быть **пуст** (первый пересчёт не завершился).

Правильно — дождаться первой сборки:

<code>
await esbuild.build(buildOptions);  // initial build
const ctx = await esbuild.context(buildOptions);
await ctx.watch();
console.log('Watch mode started (initial build done)');
</code>

{% endcut %}
||
||
KI-566
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`dist/extension.js` — не проверяется содержимое
|
{% cut "Развернуть" %}

`fs.statSync('dist/extension.js').size` — только размер. Не проверяется, что это **валидный** JS, что `require('vscode')` есть, что `module.exports.activate` определён.

Валидация — задача VS Code при загрузке. Но если `esbuild` сгенерировал «странный» файл (например, cyclic require) — VS Code упадёт с невнятной ошибкой. `build.js` не диагностирует.

{% endcut %}
||
||
KI-567
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`source-map` в production — не создаётся
|
{% cut "Развернуть" %}

Пользователь, установивший `.vsix`, может захотеть отладить расширение. Без `sourcemap` — только минифицированный код. Для разработчика расширения — неудобно, но это цена production.

{% endcut %}
||
||
KI-568
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`platform: 'node'` — не `'browser'`
|
{% cut "Развернуть" %}

VS Code расширения — Node.js (не browser). `platform: 'node'` — правильно. `'browser'` — для web-расширений (не наш случай).

{% endcut %}
||
||
KI-569
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
Нет `--minify=false` override
|
{% cut "Развернуть" %}

Если пользователь хочет «production, но с sourcemap» — нет флага. `--prod` включает minify + отключает sourcemap. `--dev` (не существует) — отключает minify + включает sourcemap. Комбинация `--prod --sourcemap` не поддерживается.

{% endcut %}
||
||
KI-570
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`watch` без обработки ошибок пересчёта
|
{% cut "Развернуть" %}

`ctx.watch()` — при ошибке компиляции (syntax error в `src/`) esbuild выведет ошибку в `logLevel: 'info'`, но `build()` **не** упадёт. Watch продолжит работать. Пользователь увидит error в консоли, но не в UI. Нужно самому проверять.

Это стандартное поведение watch. Для CI — не используется (watch — только локально).

{% endcut %}
||
||
KI-571
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`dist/` — не очищается перед сборкой
|
{% cut "Развернуть" %}

`build.js` не делает `rm -rf dist/`. Старые файлы (`dist/extension.js.map` от предыдущей dev-сборки) остаются, если в prod-сборке sourcemap отключён. То есть `dist/extension.js.map` может быть **старым** (от dev) при prod-сборке. VS Code не загружает `.map` (не указан в `files`), но при отладке — может показать **старый** sourcemap.

Правильно — `fs.rmSync('dist', { recursive: true, force: true })` перед сборкой. Или — `esbuild.build` с `outfile` перезаписывает `.js`, но `.map` остаётся. `esbuild` с `sourcemap: false` **не** удаляет старый `.map`.

{% endcut %}
||
||
KI-572
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`npm run watch` — отсутствует
|
{% cut "Развернуть" %}

Уже упомянуто. Без него `.vscode/launch.json → preLaunchTask` не работает.

{% endcut %}
||
||
KI-573
|
unknown
|
major
|
[`МодульСборкарасширения`](../МодульСборкарасширения/index.md)
|
`build.js` не в `module.exports`
|
{% cut "Развернуть" %}

`build.js` — исполняемый скрипт, не библиотека. `module.exports` не определён. `require('./build.js')` — выполнит сборку (побочный эффект), не вернёт функцию. Для тестов — неудобно.

Правильно — `if (require.main === module) { build(); } else { module.exports = { build }; }`. Сейчас — `build()` вызывается **всегда** при `require`.

{% endcut %}
||
||
KI-574
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
Только `ru` в `docs-build.js`
|
{% cut "Развернуть" %}

По аналогии с `footnotes`. Английская документация не обрабатывается — нумерация сносок в `en/` останется «с нуля на каждой странице». Если нужно и для `en`, добавляется второй `cli('footnoteNumbering', '--docsDir', './docs/en', '--outputDir', './build')` или модуль делается мультиязычным.

{% endcut %}
||
||
KI-575
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
Порядок сносок определяется `toc.yaml`
|
{% cut "Развернуть" %}

Если `.md` не упомянут в `toc.yaml` (или `toc.yaml` отсутствует), порядок файлов берётся из `collectMdFilesByToc`-fallback — обход `fs.readdirSync`, без навигации. В этом случае сквозная нумерация всё равно работает, но порядок файлов непредсказуем (зависит от ОС и версии `fs.readdirSync`). Документация без `toc.yaml` — сценарий нетипичный, но возможный (модуль `helpmap`, например, работает и без `toc`).

{% endcut %}
||
||
KI-576
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
«Болтающиеся» сноски в файлах без `toc`
|
{% cut "Развернуть" %}

`if (!fs.existsSync(htmlPath))` — если `.md` есть, но `.html` нет (файл исключён из `@diplodoc/cli`-сборки, например, через `.yfmignore`), сноски в нём не нумеруются. В `console.warn` будет `[footnotes] HTML не найден для …`.

{% endcut %}
||
||
KI-577
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
Регулярка `(fnref&#124;fn)(\d+)\b` — совпадения в произвольном тексте
|
{% cut "Развернуть" %}

`\b` стоит только в конце, но не в начале. Поэтому `myfn1` — если такое встретится в тексте — будет переименовано в `myfn4` (при offset = 3). Реальный шанс — нулевой (кто пишет `myfn1` в документации?), но теоретически модуль не «привязан» к `id=`/`href=`. Любое `fn<digits>` в тексте или CSS-классе будет перенумеровано.

То же с `[N]</a>` — ловит `[1]</a>` в любом `<a>`, не только footnote-ref. На практике совпадений нет, потому что `[N]</a>` — очень характерный паттерн для сносок.

{% endcut %}
||
||
KI-578
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
`\b` без `\b` в начале — уже упомянуто
|
{% cut "Развернуть" %}

В предыдущем пункте. Отмечу ещё раз для аккуратности.

{% endcut %}
||
||
KI-579
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
`<ol>` в state JSON — вероятно, регулярка мёртвая
|
{% cut "Развернуть" %}

<code>
newHtml = newHtml.replace(
    /&lt;ol(\s[^45]*?class=\\"footnotes-list\\"[^45]*?)&gt;/g,
    …
);
</code>

Регулярка ищет `<` → `&lt;`, `"` → `\"`. Это форма «HTML-entity + JSON-escape». В реальном выводе `@diplodoc/cli` `<ol>` внутри `<script id="diplodoc-state">` хранится либо как `<ol class=\"footnotes-list\">` (JSON-escape без HTML-entities — это JSON-строка, `<` не нужно экранировать), либо как `&lt;ol class=\"footnotes-list\"&gt;` (если проект использует `jsonEscapeHtmlForDiplodoc`-подобное экранирование — так делают наши собственные инжекторы `abbrs` / `terms` / `gosts`).

Если `@diplodoc/cli` использует только JSON-escape (что верно для стандартного Diplodoc), то в файле будет `<ol class=\"footnotes-list\" start=\"N\">` — **без** `&lt;` и `&gt;`. Эта форма **не ловится** ни первой регуляркой (`<ol(\s[^46]*class="footnotes-list"…)` — ждёт `class="…"` с обычными кавычками), ни второй (`&lt;ol` — ждёт HTML-entities).

В итоге `start` и `counter-reset` в state-JSON `<ol>` **не обновляются**. К счастью, на рендер это не влияет: браузер берёт HTML из state, но числа в сносках формируются CSS-счётчиком, который сам инициализируется через `counter-reset`. Если `counter-reset` в state-JSON не обновлён — счётчик может «съехать» после гидратации.

Проверить в DevTools на второй странице с offset > 0:

<code>
// В state (если hydrate):
JSON.parse(document.getElementById('diplodoc-state').textContent).data.html
// Ищем там <ol class=\"footnotes-list\" — есть ли start= и style=?
</code>

Если `start` там не обновлён, а `counter-reset` тоже — то после hydrate сноски могут отобразиться с локальными номерами, перебивая глобальные. Решение — добавить третью регулярку:

<code>
newHtml = newHtml.replace(
    /<ol(\s[^46]*class=\\"footnotes-list\\"[^46]*?)>/g,
    (m, attrs) => `<ol${upsertStyle(attrs, styleDecl, true)}>`
);
</code>

(с `class=\\"footnotes-list\\"` — JSON-escape без HTML-entities.)

{% endcut %}
||
||
KI-580
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
`counter-reset` не работает без CSS
|
{% cut "Развернуть" %}

Модуль добавляет `style="counter-reset: hier-list-item N"` — но работает это только если CSS темы Diplodoc использует именно `hier-list-item` в `li::before { counter-increment: hier-list-item; content: "[" counter(hier-list-item) "] " }` (или похожее). Если тема сменит имя счётчика — стиль станет «мёртвым атрибутом», а отображаемые номера снова станут локальными. Симптом: `start="4"` в HTML, но визуально `[1]`.

{% endcut %}
||
||
KI-581
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
`total` ≠ `changed`
|
{% cut "Развернуть" %}

`total` в результате — сумма `count` по всем файлам (общее число сносок). `changed` — число изменённых файлов. В CLI ни то, ни другое не выводится (только логи `[footnotes] Готово. Всего сносок: N, изменено файлов: M`). Если нужно реагировать программно — придётся ловить stdout.

{% endcut %}
||
||
KI-582
|
unknown
|
major
|
[`МодульСквознаянумерациясносок`](../МодульСквознаянумерациясносок/index.md)
|
`.yfm`-настройки не учитываются
|
{% cut "Развернуть" %}

Модуль не читает `diplodoc-helper.*` из конфига. Никаких «включить/выключить», никакого выбора языка. Только аргументы CLI. Если пользователь хочет отключить сквозную нумерацию для конкретного проекта — только через `--skip=footnoteNumbering` в `docs-build.js`.

{% endcut %}
||
||
KI-583
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
Только один язык за вызов
|
{% cut "Развернуть" %}

CLI-команда `reindexFootnotes` обрабатывает **один** `--docsDir`. В `docs-build.js` вызов прописан только для `./docs/ru`:

<code>
cli('reindexFootnotes', '--docsDir', './docs/ru'),
</code>

`en` не обрабатывается. Если в `en` есть сноски, их нумерация не пересчитывается при сборке. Починка — добавить второй `cli('reindexFootnotes', '--docsDir', './docs/en')` в `docs-build.js` или сделать модуль мультиязычным (как `abbrs`/`terms`).

{% endcut %}
||
||
KI-584
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
Сквозная нумерация сбрасывается в HTML
|
{% cut "Развернуть" %}

После `reindexFootnotes` в `.md` нумерация сквозная по проекту: файл 1 использует `[^53]`–`[^54]`, файл 2 — `[^55]`–`[^56]`. Но `@diplodoc/cli` при рендере HTML **перенумеровывает каждую страницу с 1**. То есть на странице 2 будет `[^55]` в исходнике и `[^53]` в готовом HTML.

Это ожидаемое поведение (сквозной номер в `.md` нужен только для порядка в исходниках, а не для отображения), но может сбить с толку при отладке: `grep` по `[^55]` в `.md` найдёт сноску на странице 2, а в HTML та же сноска будет `#fn1`. Сквозная нумерация в HTML — отдельная задача модуля [`footnoteNumbering`](../МодульСквознаянумерациясносок/index.md).

{% endcut %}
||
||
KI-585
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
Многострочные определения не поддерживаются
|
{% cut "Развернуть" %}

`FOOTNOTE_DEF_REGEX = /^\[\^([^57]\s]+)\]:[ \t]*(.*)$/gm` — `.*` не переходит через `\n`. Если пользователь написал:

<code>
    Вторая строка — продолжение.
</code>

То `content` будет `«Первая строка определения.»`, а вторая строка останется как обычный текст (с отступом). При переиндексации она не тронется, но потеряет связь со сноской при рендере — Diplodoc такую конструкцию, скорее всего, тоже не распознает.

Стандарт YFM/Diplodoc для многострочных определений не описан, так что это ограничение может быть неприменимо на практике. Но если пользователь пишет многострочные сноски в расчёте на поддержку — будет сюрприз.

{% endcut %}
||
||
KI-586
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
`[^58]` с буквами становится числом
|
{% cut "Развернуть" %}

После переиндексации <code>&lsqb;^7&rsqb;</code> становится <code>&lsqb;^9&rsqb;</code> (например). Это семантическая потеря: `note-abc` могло нести смысл (например, «сноска про ABC»), а после переиндексации от него остаётся только номер. Если пользователь полагается на осмысленные id — стоит предупредить, что модуль их «съест».

В текущей документации проекта все id — числа, так что проблемы нет. Но при переносе модуля в чужие проекты — стоит документировать.

{% endcut %}
||
||
KI-587
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
`applyFootnoteRenumbering` удаляет `\r?\n` после определения-сироты
|
{% cut "Развернуть" %}

<code>
let end = d.index + d.length;
if (text[end] === '\r') end++;
if (text[end] === '\n') end++;
edits.push({ index: d.index, length: end - d.index, replacement: '' });
</code>

Если «сирота» — последняя строка в файле и файл не кончается переводом строки, ничего не удалится за пределами `d.length`. Если файл кончается `\r\n`, удалятся оба символа. Логика корректна, но неочевидна: удаление «съедает» перевод строки, из-за чего между оставшимися абзацами может появиться «склейка» (пустая строка исчезнет). Визуально проявляется как слипание двух абзацев — не критично, но при ревью diff может смутить.

{% endcut %}
||
||
KI-588
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
`computeFootnoteRenumbering` не идемпотентна по `startNumber`
|
{% cut "Развернуть" %}

Если вызвать дважды с `startNumber = 1`, второй вызов вернёт `changed: false` (всё уже перенумеровано). Но если вызвать с `startNumber = 5`, результат изменится: сноски станут `5, 6, 7, …`. Это by design — для сквозной нумерации, — но при ручных экспериментах может удивить: «файл уже был правильный, а после вызова с другим `startNumber` — стал другим».

{% endcut %}
||
||
KI-589
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
Поиск `indexOf` в `analyzeDefBlock`
|
{% cut "Развернуть" %}

<code>
const gap = text.slice(prevEnd, defs[i].index);
if (!/^\s*$/.test(gap)) {
    return { canReorder: false, blockStart: 0, blockEnd: 0 };
}
</code>

`gap` может содержать **комментарии** (`<!-- ... -->`) или markdown-разметку, которая визуально «пустая», но технически — нет. В этом случае `canReorder` станет `false`, и правки пойдут по одной (что безопасно, но менее эффективно). Не баг, но стоит знать: наличие комментария между определениями отключает блочную переиндексацию.

{% endcut %}
||
||
KI-590
|
unknown
|
major
|
[`МодульСноски`](../МодульСноски/index.md)
|
`reindexFootnotesInFile` не используется
|
{% cut "Развернуть" %}

В модуле есть функция `reindexFootnotesInFile(filePath)` — «пересчитать один файл», но в `docs-build.js` и в VS Code-команде она не вызывается (только `reindexFootnotes`). Экспортируется наружу. Может пригодиться для будущих интеграций (например, «пересчитать только текущий файл»), но сейчас — мёртвый код.

{% endcut %}
||
||
KI-591
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`promptSectionIndex` не отменяет операцию
|
{% cut "Развернуть" %}

Если пользователь нажал `Escape` в диалоге индекса, `promptSectionIndex` вернёт `undefined`. В `ux_section_create`:

<code>
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
</code>

`undefined` попадёт в `sectionIndex`. Далее `createSectionFolder` → `TEMPLATE_FOLDER_NAME(sectionType, name, undefined)` — `sectionIndex` обработается как пустой (`if (hasIndex && hasIndex.trim() !== '')` → false). Итог: папка создастся **без** индекса, `index.md` без `sectionIndex`, `toc.yaml` без индекса.

Пользователь нажал `Escape`, ожидая отмены — а получил созданную секцию без индекса. Несоответствие UX.

Правильно было бы:

<code>
const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
if (sectionIndex === undefined) return; // отмена
</code>

{% endcut %}
||
||
KI-592
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`composeFullTitle` без пробела для `hasPrefix && !hasIndex`
|
{% cut "Развернуть" %}

<code>
if (hasPrefix && !hasIndex) return sectionType.value;
</code>

`'Раздел'` + `''` → `'Раздел'`. `fullTitle = 'Раздел' + 'Введение' = 'РазделВведение'`. Ни пробела, ни точки.

Это тот же кейс, что `TEMPLATE_FINAL_TITLE` обрабатывает через `'Раздел. Введение'` (точка, пробел). Расхождение между двумя функциями — реальный баг. Пользователь, создавший секцию типа «Раздел» без индекса, получит `toc.yaml` с `name: РазделВведение` (плохо) и `index.md` с `title: Раздел. Введение` (хорошо). Ссылки и навигация в `toc.yaml` будут с «некрасивым» названием.

Починка — в `composeFullTitle` добавить `+ '. '`:

<code>
if (hasPrefix && !hasIndex) return sectionType.value + '. ';
</code>

Или лучше — отказаться от дублирования, заменить `composeFullTitle` на `TEMPLATE_FINAL_TITLE`.

{% endcut %}
||
||
KI-593
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`TocYamlEntryPatchItems` добавляет в конец, не сортирует
|
{% cut "Развернуть" %}

После создания `Раздел 1` → `Раздел 2` → `Раздел 3` они в `toc.yaml` окажутся в порядке 1, 2, 3 (потому что так создавались). Но если пользователь создаёт `Раздел 5` первым, потом `Раздел 2` — в `toc.yaml` будет 5, 2. Пока не запустят `sortTocItems` (вручную через `section.Rename` или через `reindexer.directories`), порядок будет «порядок создания».

`section.Create` не вызывает `sortTocItems` после `TocYamlEntryPatchItems`. Это согласуется с `reindexer.directories` — сортировка делается в общем проходе. Но при отдельном использовании (без полной переиндексации) `toc.yaml` останется в порядке создания.

{% endcut %}
||
||
KI-595
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`createDirectory` глотает `fs`-ошибки
|
{% cut "Развернуть" %}

<code>
function createDirectory(canCreateFolder, newFolderPath, recursive, folderName, onError) {
    if (!canCreateFolder(newFolderPath, onError)) return null;
    try {
        fs.mkdirSync(newFolderPath, { recursive: recursive });
        return { folderPath: newFolderPath, folderName: folderName };
    } catch (err) {
        console.error(err);
        return null;
    }
}
</code>

`canCreateFolder` проверяет существование и права **до** вызова `fs.mkdirSync`, но между этими двумя проверками есть окно (race condition): файловая система могла измениться (параллельный процесс). Также могут быть ошибки, которые `canCreateFolder` не ловит: невалидное имя (`CON`), слишком длинный путь (> 260 символов на Windows), спецсимволы в пути на Linux.

В `catch` — только `console.error(err)`. Пользователь не видит никакого сообщения о том, что создание не удалось, — только в Developer Tools расширения.

Должно быть:

<code>
} catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    return null;
}
</code>

{% endcut %}
||
||
KI-596
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

<code>
if (!uri) return;
</code>

Команда видна в палитре (`Ctrl+Shift+P` → «Создать секцию») — VS Code позволяет вызвать её без контекста Explorer. В этом случае `uri` = `undefined`, и функция молча возвращается. Пользователь ничего не видит.

Есть два сценария:

1. **Пользователь вызвал из палитры** — ожидает, что его спросят, где создавать.
2. **Пользователь вызвал из контекстного меню** — `uri` гарантирован (`when: explorerResourceIsFolder`).

Можно было бы при `!uri` вызвать `vscode.window.showOpenDialog` (папка) и дальше работать. Или — если считаем, что команда только из контекстного меню, — `when` в `package.json` мог бы запретить вызов из палитры (`"when": "false"` в `commandPalette`). Сейчас — разрешено и молча не работает.

{% endcut %}
||
||
KI-597
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`<` `>` в `title` ломают YAML
|
{% cut "Развернуть" %}

`ShowSectionNameSelector` разрешает `<` и `>`. `IndexMdFileCreate` пишет:

<code>
title: Раздел 1. <Введение>
</code>

`js-yaml` (через `YAML.stringify`) может автоматически заключить в кавычки, если значение содержит спецсимволы. Проверка:

- если `YAML.stringify({ title: 'Раздел 1. <Введение>' })` → `title: Раздел 1. <Введение>` (без кавычек) — YAML невалиден;
- если с кавычками → `title: 'Раздел 1. <Введение>'` — валидно.

`js-yaml` и `yaml` (пакет) по-разному обрабатывают `<>`. В `.eslintrc.js`/`package.json` оба пакета в зависимостях, но `sections.core` использует **`yaml`** (пакет) через `YAML.stringify`. У `yaml` (пакет) `stringify` по умолчанию добавляет кавычки, если значение выглядит как специальный YAML-токен. `<` и `>` — не YAML-спецсимволы (в YAML спецсимволы: `@`, `` ` ``, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `!`, `&#124;`, `>`, `'`, `"`, `%`). Из них `>` — да (block scalar indicator в начале значения), `&#124;` — тоже. `<` — нет.

То есть `title: Раздел 1. <Введение>` — валидный YAML (значение — plain scalar, `<` допустим). А `title: Раздел 1. >Введение>` — **сломается**: `>` в начале значения интерпретируется как начало folded scalar. Пользователь, введший `>Введение` в имя, получит битый frontmatter. VS Code покажет `parse error` при открытии.

Правильно — валидировать в `ShowSectionNameSelector`: запретить `@`, `` ` ``, `&#124;`, `>`, `&`, `*`, `!`, `%` в начале или вообще в имени. Или — всегда оборачивать `title` в кавычки (что `YAML.stringify` и делает для некоторых случаев, но не для всех).

{% endcut %}
||
||
KI-598
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`IndexMdFileCreate` не проверяет существование файла
|
{% cut "Развернуть" %}

<code>
function IndexMdFileCreate(folderPath, title, sectionType, sectionValue, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    const metaObj = { … };
    fs.writeFileSync(filePath, `---\n${YAML.stringify(metaObj)}---`, 'utf8');
}
</code>

`fs.writeFileSync` **перезаписывает** файл, если он уже существует. В `section.Create` это безопасно: `createSectionFolder` только что создал папку (пустую), файлов нет. Но если кто-то вызовет `IndexMdFileCreate` напрямую на существующей папке — данные потеряются.

Симметричная проблема: `TocYamlEntryPatchItems` не проверяет, что в `toc.yaml` родителя **нет** записи с таким же `href`. Если по какой-то причине `createSectionFolder` вернул папку, которая уже была (например, race condition), в `toc.yaml` появится дубль.

{% endcut %}
||
||
KI-599
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
Сообщение об успехе не содержит имени папки
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(
    translate(nls_ts.plugin.section.create.info.success, fullTitle, sectionType.label)
);
</code>

NLS-ключ `plugin.section.create.info.success`: `"Раздел «{0}» ({1}) создан!"`. Куда попадают `fullTitle` («Раздел 1. Введение») и `sectionType.label` («Раздел»). Итого: «Раздел «Раздел 1. Введение» (Раздел) создан!».

Слово «Раздел» трижды: в «Раздел «…» (Раздел)», плюс внутри `fullTitle`. Читается странно. И **имя папки** (`folderName`, `Раздел1.Введение`) не упоминается — если пользователь захочет открыть папку из терминала, придётся угадывать имя.

Идеально было бы: «Создана секция «Введение» (`Раздел1.Введение`). Тип: Раздел. Индекс: 1.» — с явным именем папки.

{% endcut %}
||
||
KI-600
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`isValidName` — единственная проверка, и она почти пустая
|
{% cut "Развернуть" %}

`isValidName` — `name.trim().length > 0 && name.length <= 255`. То есть:

- пробелы в начале/конце — пропустятся (`.trim()` — только в проверке; `TEMPLATE_FOLDER_NAME` вырежет все пробелы и спецсимволы);
- emoji — пропустятся (в `title`), вырежутся (в `folderName`);
- HTML-теги — пропустятся (в `title`).

После создания пользователь увидит: `title: <b>Жирный</b>`, `folderName: Жирный` — и это «работает». Не критично (нет `escapeHtml` при записи в YAML), но шокирует.

{% endcut %}
||
||
KI-601
|
unknown
|
major
|
[`МодульСозданиесекции`](../МодульСозданиесекции/index.md)
|
`calculateNextIndex` не учитывает уже существующие `folderName` с одинаковым индексом
|
{% cut "Развернуть" %}

`calculateNextIndex` ищет максимальный `sectionIndex` среди детей. Если дети проиндексированы — работает. Если у ребёнка `sectionIndex` не заполнен (пустая строка, `null`), он **пропускается**:

<code>
if (sectionType && FrontMatterSectionTypesIndexed.includes(sectionType) && sectionIndex) {
    …
}
</code>

Итог: если в родителе есть папка «Раздел1.Введение» с `sectionIndex: ''` (пользователь отредактировал вручную), `calculateNextIndex` её не увидит, вернёт `'1'` — и `section.Create` создаст «Раздел1.Новое», которое схлопнется с «Раздел1.Введение». `canCreateFolder` (в `createSectionFolder`) проверит `fs.existsSync` — папка «Раздел1.Новое» не существует, создание пройдёт. **Коллизия**: две папки с одинаковым префиксом индекса.

Не критично (секции не «сливаются»), но `sectionIndex` в `toc.yaml` будет дублироваться, `sortTocItems` выдаст неопределённый порядок.

{% endcut %}
||
||
KI-602
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
В `title` попадает путь, а не заголовок статьи
|
{% cut "Развернуть" %}

`displayPath` в `extractHelptagTagValue` — это относительный путь `.md`-файла, а не его `title` из frontmatter. В результате на странице `helptags/index.md` под каждым тегом — технические имена:

</code>
* **breadcrumb**
  * [Модули/МодульХлебныеКрошки](../Модули/МодульХлебныеКрошки/index.md)
</code>

А не человекочитаемые («Модуль. Хлебные крошки»). Для навигации сгодится, но в сравнении с `contexts` (где `buildTree` резолвит `title` через `index.md` родительской папки) выглядит беднее. Починка — добавить `getTitleFromMetadata` в extractor (как в `abbrs`/`terms`/`gosts`) или отдельный `resolveFolderTitle` (как в `contexts`).

{% endcut %}
||
||
KI-603
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
`SKIP_DIRS` короче, чем у соседних модулей
|
{% cut "Развернуть" %}

`walkMdFilesGetHelptags` пропускает только две папки — `helptags` и `contexts`. У `abbrs` и `terms` список шире: `['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap']`. У `contexts` — только `contexts` (и `helptags` через `context-search.client.js`-косвенность).

Если у пользователя есть папка `figures/` или `roadmap/` с ручными `.md` (не сгенерированными), где стоит `helptag:`, — она попадёт в индекс. С генераторами (`figures/index.md`, `roadmap/index.md`) проблемы нет: у них нет поля `helptag:` в frontmatter, они туда не попадут. Но несимметричность может сбить с толку при чтении кода.

{% endcut %}
||
||
KI-604
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
Страницы под тегом не сортируются
|
{% cut "Развернуть" %}

`pages[]` пополняется в порядке обхода папок (`fs.readdirSync`), а не по алфавиту и не по `rank`. На `contexts` аналогичный список сортируется через `Intl.Collator`, здесь — нет. Порядок между запусками стабилен (пока не изменится файловая структура), но не семантичен.

{% endcut %}
||
||
KI-605
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
Модуль не экспортируется из `diplodoc-helper-cli.js`
|
{% cut "Развернуть" %}

В отличие от `generateHelpMap`, `generateContexts`, `generateAbbrs`, `generateTerms`, `generateGosts` — функция `runGeneration` для `helptags` **не входит** в `module.exports` файла `src/plugins/diplodoc-helper-cli.js`:

<code>
const { runGeneration: generateHelptags } = require('./helptags/helptags.js');
// ...
module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    // ... generateHelptags отсутствует
};
</code>

Внутри CLI-команды `helptags` вызов работает (`if (require.main === module)`), но при попытке `require('diplodoc-helper-cli').generateHelptags` — `undefined`. Для внешних интеграций (кто-то хочет встроить вызов) это неудобно. Починка — добавить в `module.exports`.

{% endcut %}
||
||
KI-606
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
Нет `helptags.paths.yaml` — путь захардкожен
|
{% cut "Развернуть" %}

Папка `docs/<lang>/helptags/` задана литералом в `generateFilesForLang`. В отличие от `abbrs`, `terms`, `gosts`, где папка настраивается через YAML, здесь смена пути — правка кода.

{% endcut %}
||
||
KI-607
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
`helptag.Update` и `helptag.Delete` не связаны с этим модулем
|
{% cut "Развернуть" %}

Пользователь, ищущий «helptag» в палитре команд VS Code, найдёт `helptag.Update` / `helptag.Delete` и `generateHelpMaps`. Ни одна из них не генерирует страницу-указатель. Легко принять одну за другую:

- `helptag.Update` — правит поле в **одном** разделе;
- `helptag.Delete` — удаляет поле из **одного** раздела;
- `generateHelpMaps` — модуль `helpMap`, JSON для фронтенда;
- `helptags` (этот модуль) — только через CLI.

Разделение по слоям и по смыслу, но с точки зрения пользователя — «helptag» в трёх разных контекстах.

{% endcut %}
||
||
KI-608
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
`lstatSync` без `withFileTypes` — потенциальная проблема с симлинками
|
{% cut "Развернуть" %}

`walk` в collector использует `fs.lstatSync(fullPath).isDirectory()`. Для символической ссылки на папку `isDirectory()` вернёт `false` (lstat не следует по ссылке). Если в проекте есть симлинк-папка, её содержимое не будет проиндексировано. В `contexts`/`abbrs`/`terms` используется `readdirSync(..., { withFileTypes: true })` — поведение похожее, но чуть иное для симлинков.

{% endcut %}
||
||
KI-609
|
unknown
|
major
|
[`МодульСправочныетеги`](../МодульСправочныетеги/index.md)
|
Возможные пустые языковые папки
|
{% cut "Развернуть" %}

Если в `en/` нет ни одной статьи с `helptag:`, `helptagMap` пуст → `generateFilesForLang` возвращает `false` → `results.failed.push('en')`. В CLI это никак не отражается (модуль не читает `results`), но в VS Code-вызове (если бы он был) это выглядело бы как ошибка. Сейчас VS Code-вызова нет, так что пункт «спящий».

{% endcut %}
||
||
KI-610
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`version: "1.4"` захардкожен и не связан с версией пакета
|
{% cut "Развернуть" %}

<code>
const stubVersion = '1.4';
</code>

Версия `1.54.0` в `package.json` и `1.4` в `presets.yaml` — **разные числа**. Если статья использует `{{ about.version }}`, пользователь увидит «1.4», что не совпадает ни с версией расширения, ни с семантической версией документации (если она есть отдельно). При обновлении релиза `stubVersion` не меняется.

Ожидаемое поведение — читать версию из `package.json` (или из отдельного конфига документации). Реальный фикс: `require('../../../package.json').version` или параметр CLI.

{% endcut %}
||
||
KI-611
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`author` захардкожен с личным email
|
{% cut "Развернуть" %}

<code>
const stubAuthor = '[Вавренюк Виктор Андреевич](mailto:vavrenyuk@ascon.by)';
</code>

Это конкретное имя и email — они попадают в `presets.yaml` и, если статья использует `{{ about.author }}`, — в публичную документацию. Для типового проекта это может быть неприемлемо. Как минимум — должно быть в конфиге, а не в коде.

{% endcut %}
||
||
KI-612
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`default` и `internal` дублируются
|
{% cut "Развернуть" %}

Обе секции формируются **одним** вызовом `generateBlock()`, то есть содержат идентичные данные. В `docs-build.js` используется `--apply-presets internal`, `default` не используется нигде.

Смысл дублирования неясен. Возможно, задумывалось разделение на «публичные» и «внутренние» данные (например, `default` без email автора, `internal` с ним), но реализация этого не делает.

Если понадобится «внешняя» и «внутренняя» сборка с разными данными — сейчас это невозможно без правки `generateBlock`.

{% endcut %}
||
||
KI-613
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`totalArticles` = все статьи всех языков
|
{% cut "Развернуть" %}

Модуль не фильтрует по языку — `articles.length` включает и `ru`, и `en`. Если в проекте 400 статей на `ru` и 100 на `en`, `total_articles` = `500`. Пользователь, читающий `{{ stats.total_articles }}` в русской статье, увидит число, включающее английские статьи.

По смыслу — это «общее число статей в проекте», а не «число статей в данной локализации». Может быть намеренно (для сводки), но легко сбивает с толку. `bytescounter`/`contextmap`/`helptagmap` считают отдельно по языкам (у них `matrixData.ru` и `matrixData.en`), `presetsStat` — общее.

Если понадобится по языкам — придётся либо генерировать `presets.ru.yaml` + `presets.en.yaml` (не поддерживается Diplodoc из коробки), либо оставить `presets.yaml` с подсекциями `stats.ru` / `stats.en` и переписать `generateBlock`.

{% endcut %}
||
||
KI-614
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`totalSections` и `totalChapters` — эвристика по title
|
{% cut "Развернуть" %}

Считаются статьи, у которых `title` матчит `/^Раздел\s+\d+/` или `/^Глава\s+\d+/`. То есть — только `index.md`-файлы разделов и глав, у которых title оформлен строго по шаблону `reindexer` (`Раздел N. <название>`).

Проблемы:

- **`Часть` (Part) не считается.** Тип `Part` есть в `FrontMatterSectionTypes`, но в статистике его нет.
- **Соглашение хрупкое.** Если у пользователя title `Раздел 1: Введение` (с двоеточием вместо точки) — не сработает. Если `1. Введение` (без слова «Раздел») — не сработает.
- **Статьи с title «Раздел N …» вне разделов** — тоже попадут в счёт. Например, если пользователь создал статью с таким title, она посчитается «разделом».

Правильный способ — читать `sectionType` из frontmatter, но `helpMap` его не кладёт в `app-help-contents.json`. Так что `presetsStat` вынужден парсить title — обходное решение.

{% endcut %}
||
||
KI-615
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`reading_time` — «время чтения одной статьи», не всего руководства
|
{% cut "Развернуть" %}

<code>
const readingTimeNumeric = Math.ceil(avgSizeNumeric / 2500);
</code>

`avgSizeNumeric` — средний размер **одной** статьи. `2500` — байт в минуту (приблизительно, 2500 символов = ~400 слов). Значит, `reading_time` — **среднее время чтения одной статьи**, не общее.

Если статья пишет:

<code>
В руководстве {{ stats.total_articles }} статей. Общее время чтения —
{{ stats.reading_time }} минут.
</code>

Пользователь прочитает «общее время чтения — 5 минут» и удивится: 487 статей за 5 минут?

Правильно было бы `totalSize / 2500` (общее время) или переименовать поле в `avg_reading_time`. Сейчас название вводит в заблуждение.

{% endcut %}
||
||
KI-616
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`git-meta.json` — если файла нет и CI запускается
|
{% cut "Развернуть" %}

По умолчанию `gitMeta`:

<code>
{
    firstCommitDate: 'Январь 2025 г.',
    lastCommitHash: 'unknown',
    lastCommitDate: '',
}
</code>

В CI без `git-meta.json` (например, разработчик забыл закоммитить):

- `start_date: "Январь 2025 г."` — фиктивная дата;
- `last_update: ""` — **пустая строка** (fallback на `new Date()` в `generateStat` работает только если `lastCommitDate` был непустым... но он пустой из дефолта, а `if (!lastCommitDate)` — сработает, подставит текущее время; так что не пустая, а «сейчас»);

Стоп, перечитываю:

<code>
if (!lastCommitDate) {
    const now = new Date();
    lastCommitDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}
</code>

Да, если `lastCommitDate` пуст — подставляется **текущее время**. То есть на CI без `git-meta.json` в `presets.yaml` попадёт «дата сейчас», что для сборки 2024 года (если такое возможно) будет ложью.

Это **не баг** текущего сценария (разработчик обычно коммитит `git-meta.json`), но потенциальная ловушка.

{% endcut %}
||
||
KI-617
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`console.warn`/`console.error` без `process.exitCode`
|
{% cut "Развернуть" %}

Как и `helptags`/`footnoteNumbering`, при ошибке `presetsStat` **не падает**:

<code>
} catch (error) {
    console.error('❌ Ошибка обработки статистики:', msg);
}
</code>

`docs-build.js` выполняет шаг `periodicStat` и идёт дальше, как будто всё хорошо. Если `app-help-contents.json` отсутствует (например, `helpMap` упал) — `presets.yaml` не обновится, `@diplodoc/cli` соберёт статью с устаревшими `{{ stats.* }}` или с warning-ами о ненайденных переменных.

Правильно было бы `process.exitCode = 1` в `catch` — тогда `docs-build.js` остановится на шаге `periodicStat`, а не продолжит со сломанными данными.

{% endcut %}
||
||
KI-618
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`periodicStat` в `docs-build.js` между `tocCleanMode` и `contexts`
|
{% cut "Развернуть" %}

В `docs-build.js`, фаза `pre`:

<code>
cli('helpMap'),
cli('tocCleanMode'),
cli('periodicStat'),
cli('contexts'),
</code>

`tocCleanMode` — это post-обработчик (`injectCleanMode`), он должен идти **после** `@diplodoc/cli`. Но стоит в `pre` — до сборки. Это **отдельный баг** `docs-build.js`, не связанный с `presetsStat`, но обращающий на себя внимание при чтении порядка шагов.

`presetsStat` **не зависит** от `tocCleanMode` (тот не читает `presets.yaml` и не пишет его). Так что баг `docs-build.js` на `presetsStat` не влияет, но при отладке стоит помнить: «если `tocCleanMode` не сработал — это не `presetsStat` виноват».

{% endcut %}
||
||
KI-619
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`STAT_FILENAME` захардкожен
|
{% cut "Развернуть" %}

<code>
const STAT_FILENAME = 'app-help-contents.json';
</code>

В `helpmap.config.js`:

<code>
outputFileName: 'app-help-contents.json',
</code>

Два места, одно значение. Если `helpmap.config.js` изменится — `presetsStat` молча сломается (файл не найден). Импорт `{ outputFileName }` из `helpmap.config` устранил бы дублирование.

{% endcut %}
||
||
KI-620
|
unknown
|
major
|
[`МодульСтатистикапресетов`](../МодульСтатистикапресетов/index.md)
|
`presets.yaml` — «сгенерированный файл в `docs/`»
|
{% cut "Развернуть" %}

Файл живёт в `docs/presets.yaml`. Это нестандартное место для генерируемого артефакта — обычно генерируемое кладут в `build/` или отдельный `_generated/`. Но Diplodoc ищет `presets.yaml` именно в корне `docs/`, так что без переопределения пути (если оно есть) не обойтись.

Практические последствия:

- если `presets.yaml` не в `.gitignore` — будет «шумный» diff на каждом релизе;
- если в `.gitignore` — новый клон репозитория не соберётся без предварительного `periodicStat` (что нормально для пайплайна, но неочевидно для новичка).

Сейчас `.gitignore` содержит `**\build`, `**\node_modules`, `**/dist`, `**/coverage`. `presets.yaml` **не** в игноре — значит, коммитится.

{% endcut %}
||
||
KI-621
|
unknown
|
major
|
[`МодульТермины`](../МодульТермины/index.md)
|
Коллизия анкоров при транслитерации
|
{% cut "Развернуть" %}

`termAnchorId(term)` и `termOccurrenceId(term, n)` строятся как `term-<slugify_latin_alphanumeric(term)>[-N]`. Два разных термина с одинаковой транслитерацией (`Ёж` и `Yozh`) дадут одинаковый анкор.

{% endcut %}
||
||
KI-622
|
unknown
|
major
|
[`МодульТермины`](../МодульТермины/index.md)
|
`showWarnings` и `showUnused` выключены
|
{% cut "Развернуть" %}

В `terms.config.js` `showWarnings: false`, `showUnused: false`. Баннер «Нет в словаре» и метка «В статьях не используется» не появятся, пока не поправить конфиг.

{% endcut %}
||
||
KI-624
|
unknown
|
major
|
[`МодульТермины`](../МодульТермины/index.md)
|
Требуется `class="term"` — иначе термин «выпадает»
|
{% cut "Развернуть" %}

`<abbr>` без `class="term"` не попадёт ни в индекс, ни в тултипы. Линтер `terms` его не увидит; его подхватит линтер `abbrs` (фильтр ровно противоположный — «без `class=`»). Диагностики на путаницу нет.

{% endcut %}
||
||
KI-625
|
unknown
|
major
|
[`МодульТермины`](../МодульТермины/index.md)
|
Линтер чувствителен к регистру
|
{% cut "Развернуть" %}

`data-term="Абстракция"` не совпадёт с `term: абстракция` в словаре.

{% endcut %}
||
||
KI-626
|
unknown
|
major
|
[`МодульТермины`](../МодульТермины/index.md)
|
Дублирование `shared/*` с `abbrs`
|
{% cut "Развернуть" %}

Папки `src/plugins/abbrs/shared/` и `src/plugins/terms/shared/` содержат идентичный код. Осознанное решение (независимое распространение модулей), но любая правка должна дублироваться.

{% endcut %}
||
||
KI-627
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
Стили живут вне модуля
|
{% cut "Развернуть" %}

Ни один `.css` не лежит в `src/plugins/terms/`. Классы `.dl-term-tip`, `.dl-term-occ-hidden`, `.dl-term-occ-last`, `.dl-term-occ-more` и переменная `--dl-term-arrow-left` должны быть определены в теме или в `_assets/styles/`. Если файл потеряется — списки не сворачиваются, тултипы появляются в левом верхнем углу.

{% endcut %}
||
||
KI-628
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
`MutationObserver` не отключается
|
{% cut "Развернуть" %}

`obs.observe(document.body, { childList: true, subtree: true })` — подписка на все изменения DOM. На страницах с интенсивной динамикой (табы, видео, скроллы) это даёт лишние вызовы `initAll()` на каждое изменение. Идемпотентность спасает от логических ошибок, но не от перебора DOM.

{% endcut %}
||
||
KI-629
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
`getBoundingClientRect()` на каждом `mouseenter` и `scroll`
|
{% cut "Развернуть" %}

`reposition()` пересчитывает геометрию тултипа на каждое наведение **и** на каждый `scroll`. Это `forced reflow`. При плотной разметке с десятком `<abbr class="term">` и активном скролле страницы это может давать заметные просадки FPS. Кеширование `tipWidth`/`tipHeight` или `requestAnimationFrame`-троттлинг не реализованы.

{% endcut %}
||
||
KI-630
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
`scroll`-подписка не убрана в отличие от `abbrs.client`
|
{% cut "Развернуть" %}

`window.addEventListener('scroll', reposition, { passive: true })` — подписка, которая в `abbrs.client` отсутствует. Если это осознанное решение (у `terms` тултип может быть `absolute` и требовать пересчёта при скролле), оно нигде не задокументировано. Если `terms` тултип `fixed`, как у `abbrs`, — подписка лишняя и её стоит убрать.

{% endcut %}
||
||
KI-631
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
Работает только при наличии маркера `id="dl-term-occ-client"`
|
{% cut "Развернуть" %}

Если инжектор по какой-то причине не отработал, клиент в страницу не попадёт. Проверка в DevTools — по маркеру.

{% endcut %}
||
||
KI-632
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
Polling-fallback срабатывает слишком долго
|
{% cut "Развернуть" %}

Если `initAll()` никогда не вернёт `> 0` (на странице нет терминов), клиент опрашивает DOM 120 раз по 250 мс (30 секунд). Ограничение есть, но нет условия раннего выхода.

{% endcut %}
||
||
KI-633
|
unknown
|
major
|
[`МодульТерминыКлиент`](../МодульТерминыКлиент/index.md)
|
«Ещё/свернуть» захардкожено
|
{% cut "Развернуть" %}

`injectTermsClientScript` формирует подписи по `lang === 'ru' ? 'ещё' : 'more'`. Для языков, отличных от `ru` и `en`, подписи будут английскими.

{% endcut %}
||
||
KI-634
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`removeFileOrDirectory` с `force: true` — тихое «успешно»
|
{% cut "Развернуть" %}

<code>
function removeFileOrDirectory(isDirectory, deletedPath) {
    if (isDirectory) {
        fs.rmSync(deletedPath, { recursive: true, force: true });
    } else {
        fs.unlinkSync(deletedPath);
    }
}
</code>

Для папки `fs.rmSync(deletedPath, { recursive: true, force: true })` **не бросает** исключение при:

- отсутствии прав (файл только для чтения, папка защищена);
- занятости файла другим процессом (Windows);
- слишком длинном пути (> 260 символов на Windows без `\\?\`).

Модуль после вызова показывает `"Раздел «<folderName>» успешно удалён."`. Пользователь считает, что раздел удалён, а на диске он остался.

Для файла (`fs.unlinkSync`) — наоборот, ошибка бросится, `catch` её поймает, покажет `"Ошибка при удалении: …"`.

Рассогласование в поведении. `force: true` полезно для идемпотентности (уже удалённый файл — не ошибка), но не должно глушить ошибки прав/занятости.

Правильный фикс — либо убрать `force: true` (тогда ошибка поймается `catch`), либо добавить предварительную проверку `checkDeleteAccess` (см. ниже).

{% endcut %}
||
||
KI-635
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`checkDeleteAccess` не используется
|
{% cut "Развернуть" %}

В `src/commands/diplodoc-helper.fs.access.js` есть функция:

<code>
function checkDeleteAccess(paths) {
    for (const p of paths) {
        const parent = path.dirname(p);
        try {
            fs.accessSync(parent, fs.constants.W_OK);
        } catch {
            throw new Error(`Нет прав на удаление ${p} (нет прав в родительской папке)`);
        }
    }
}
</code>

Она проверяет права на запись в родительской папке. Но `ux_section_delete` и `ux_file_delete` её **не вызывают**. Модуль `fs.access` фактически мёртвый код.

Если бы вызывали — `catch` поймал бы «нет прав» **до** начала удаления, и пользователь получил бы внятное сообщение вместо «успешно удалён» (при `force: true`).

{% endcut %}
||
||
KI-636
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`TocYamlEntryRemove` ищет только `href: <folderName>/index.md`
|
{% cut "Развернуть" %}

<code>
const targetHref = `${folderName}/${FrontMatterFiles.INDEX_MD}`;
tocData.items = tocData.items.filter(item => item[FrontMatterToc.ITEMS_HREF] !== targetHref);
</code>

`FrontMatterFiles.INDEX_MD` — `'index.md'`. То есть запись удаляется, только если `href` **точно** `folderName/index.md`.

Если в `toc.yaml` родителя запись была добавлена:

- вручную с `href: folderName/index.yaml` (старый формат, тоже валидный);
- или `href: folderName/` (ссылка на папку, с `include.mode: link`);
- или `href: folderName/index.html` (сборка HTML напрямую);

— фильтр **не сработает**. Запись останется в `toc.yaml`, но папки `folderName/` больше нет. `@diplodoc/cli` при следующей сборке упадёт с `"Файл не найден"`.

Правильно — проверять все варианты:

<code>
const variants = new Set([
    `${folderName}/index.md`,
    `${folderName}/index.yaml`,
    `${folderName}/index.html`,
    `${folderName}/`,
]);
tocData.items = tocData.items.filter(item => !variants.has(item[FrontMatterToc.ITEMS_HREF]));
</code>

Плюс — проверять `item.include?.path`: если `include.path` начинается с `folderName/`, это тоже запись на удаляемую секцию.

{% endcut %}
||
||
KI-637
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`getLanguageRoot(parentDir)` — иногда «не тот» корень
|
{% cut "Развернуть" %}

`getLanguageRoot(sourcePath)`:

<code>
let current = path.dirname(sourcePath);
while (current && current !== path.parse(current).root) {
    const basename = path.basename(current).toLowerCase();
    if (basename === 'docs') {
        const rel = path.relative(current, sourcePath);
        const firstSegment = rel.split(path.sep)[0];
        if (firstSegment && firstSegment !== '..' && firstSegment !== '') {
            const langCandidate = path.join(current, firstSegment);
            if (fs.existsSync(langCandidate) && fs.statSync(langCandidate).isDirectory()) {
                return langCandidate;
            }
        }
        return current;
    }
    if (isLanguageRoot(current) && !isDiplodocSection(current)) {
        return current;
    }
    current = path.dirname(current);
}
</code>

Проблема: `isLanguageRoot(current)` определяется как «есть `toc.yaml`, нет `index.md`». Если у пользователя есть папка `docs/ru/foo/` без `index.md`, но с `toc.yaml` (например, «черновики»), `getLanguageRoot` вернёт **её**, а не `docs/ru/`. Тогда `findReferencesToMdSection` ищет ссылки только внутри `docs/ru/foo/`, а ссылки на удаляемый раздел из `docs/ru/bar.md` пропустит.

Практически: `isLanguageRoot` должен проверять basename на соответствие `/^[a-z]{2}$/i`, а не только наличие `toc.yaml`. Или — `getLanguageRoot` должен сразу искать `docs/<lang>` по сегментам пути (через `parts.findIndex(p => p === 'docs')`), как в fallback.

{% endcut %}
||
||
KI-638
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`updateLinksInProject` обходит **все** `.md` в проекте, включая внутри удаляемого раздела
|
{% cut "Развернуть" %}

<code>
async function updateLinksInProject(projectRoot, transformTarget, stubText) {
    const files = await findFiles(projectRoot, '.md');
    for (const filePath of files) { … }
}
</code>

`findFiles(projectRoot, '.md')` вернёт все `.md`, включая `targetDir/**/*.md`. Для ссылок **внутри** удаляемого раздела, которые указывают на другие файлы **того же раздела**, `transform` вернёт `null` → текст станет `**удалено**`.

Практические последствия:

- если удаление пройдёт успешно — файлы внутри раздела удалятся, изменения неважны;
- если удаление **провалится** (см. `force: true`) — в сохранённых файлах раздела будут `**удалено**` вместо реальных ссылок. Пользователь увидит «раздел на месте, но содержимое испорчено».

Правильно — исключать `targetDir` из обхода:

<code>
const files = (await findFiles(projectRoot, '.md'))
    .filter(f => !f.startsWith(targetDir + path.sep) && f !== targetDir);
</code>

Или, как минимум, `targetDir/**/*.md` не читать и не писать. Сейчас `findReferencesToMdSection` **исключает** их из `references` (для сообщения), но `updateLinksInProject` (для действий) — **не** исключает. Рассогласование.

{% endcut %}
||
||
KI-639
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`references` используется только как «флаг» для `updateLinksAfterDelete`
|
{% cut "Развернуть" %}

<code>
if (references.length > 0) {
    await updateLinksAfterFolderDelete(deletedPath, projectRoot, stubText);
}
</code>

`updateLinksAfterFolderDelete` обходит **все** `.md` и вызывает `transform`. Не важно, какие файлы в `references` — если есть хоть одна ссылка, обходятся все. Если `references` пуст — обхода нет (ссылок нет).

То есть `references` (результат `findReferencesToMdSection`) **не** определяет список файлов для замены. Только факт «есть ли ссылки вообще». Само обновление — по всему `projectRoot`.

Практически это работает (заменяются все), но:

- **двойная работа**: `findReferencesToMdSection` обходит все `.md` (для сообщения), потом `updateLinksAfterFolderDelete` обходит все `.md` ещё раз (для замены). На большом проекте — заметно.
- **если `findReferencesToMdSection` нашёл ссылки, но `updateLinksAfterFolderDelete` упадёт на каком-то файле** — `updateLinksInProject` ловит `try/catch` внутри цикла (`console.warn`), не бросает наружу. Ошибка **не** прервёт цикл. См. следующий пункт.

{% endcut %}
||
||
KI-640
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`updateLinksInProject` глотает ошибки
|
{% cut "Развернуть" %}

<code>
for (const filePath of files) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = updateLinksInContent(content, filePath, transformTarget, stubText);
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    } catch (err) {
        var msg = err instanceof Error ? err.message : String(err);
        console.warn(`Ошибка обработки ${filePath}:`, msg);
    }
}
</code>

Если `fs.writeFileSync` упадёт на каком-то файле (нет прав, диск переполнен), `catch` проглотит ошибку, выведет `console.warn`, и цикл продолжит. Внешний `catch` в `ux_section_delete` **не** сработает — он увидит «успешно» (потому что `updateLinksInProject` не бросил).

В итоге: часть файлов обновлена, часть — нет. Пользователь видит «успешно», а где-то остались битые ссылки. См. «Известные ограничения».

{% endcut %}
||
||
KI-641
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`findReferencesToMdSection` — только внутри `projectRoot`
|
{% cut "Развернуть" %}

`projectRoot = docs/ru/`. Если проект мультиязычный (`docs/ru`, `docs/en`), ссылки из `docs/en/` на `docs/ru/…` **не** найдутся. Практически — межъязыковые ссылки редки, но если есть — они не заменятся, `@diplodoc/cli` упадёт.

Модуль работает в «один язык за раз». Для мультиязычного нужно обходить `path.dirname(projectRoot)` (то есть `docs/`), но это уже другой масштаб.

{% endcut %}
||
||
KI-642
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

Как и в `section.Create`. `if (!uri) return;` — без сообщения. Команда видна в палитре, но не работает.

{% endcut %}
||
||
KI-643
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`references` может врать
|
{% cut "Развернуть" %}

`findReferencesToMdSection` считает ссылки по регулярке `/\[([^61]]*)\]\(([^62]+)\)/`. Не учитывает:

- **reference-style links** (`[text][ref]` + `[ref]: url` отдельной строкой);
- **HTML-ссылки** (`<a href="…">`);
- **wiki-links** (`[[path]]`, если где-то используются).

Если в проекте есть reference-style ссылки на удаляемый раздел — в `references` их не будет. Модуль покажет «Ссылок не найдено», а после удаления `@diplodoc/cli` будет ругаться на битую ссылку. См. `parseMarkdownLinks` — там только inline-формат.

{% endcut %}
||
||
KI-644
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
Отсутствует `confirm` для «много ссылок»
|
{% cut "Развернуть" %}

Если `references.length > 100`, сообщение покажет только 12 первых и «... и ещё N». Пользователь не увидит полный список. Но кнопка «Удалить» всё равно активна — нажатие удалит раздел и заменит все 100 ссылок.

Можно было бы при большом числе ссылок требовать второй confirm или делать dry-run. Сейчас — один шаг.

{% endcut %}
||
||
KI-645
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
Файлы и папки только через `force: true` — нет «частичного» удаления
|
{% cut "Развернуть" %}

`fs.rmSync(deletedPath, { recursive: true, force: true })` — либо удалит всё, либо (при `force: true`) — не бросит, но оставит часть. Нет сценария «удалилось 90%, покажу, что осталось». Если в папке 1000 файлов и один занят — `fs.rmSync` с `force: true` попробует удалить все, «занятый» пропустит молча. Результат: 999 удалено, 1 осталось, папка на месте. Пользователь увидит «успешно».

{% endcut %}
||
||
KI-646
|
unknown
|
major
|
[`МодульУдалениесекции`](../МодульУдалениесекции/index.md)
|
`smart.delete` не различает «не-секция с toc.yaml»
|
{% cut "Развернуть" %}

Если пользователь вызовет `smart.delete` на папке `docs/ru/foo/`, у которой нет `index.md` (не секция), но `toc.yaml` родителя на неё ссылается (например, `include` на подпапку без индекса) — `smart.delete` пойдёт в `ux_file_delete`, `TocYamlEntryRemove` **не** вызовется. Запись в `toc.yaml` останется.

Это ограничение `file.Delete`, но проявляется через `smart.delete` — пользователь ожидает, что «Удалить, очищая ссылки» очистит всё. См. будущую статью `file.Delete`.

{% endcut %}
||
||
KI-647
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
Не чистит `toc.yaml` родителя
|
{% cut "Развернуть" %}

`file.Delete` **не** вызывает `TocYamlEntryRemove`. Если удаляется папка, на которую ссылался `toc.yaml` родителя (через `items.href` или `include.path`), запись остаётся. `@diplodoc/cli` при следующей сборке упадёт с ошибкой «файл не найден».

`section.Delete` эту проблему решает (через `TocYamlEntryRemove`). `file.Delete` — нет.

Практически: `file.Delete` для **файлов** безопасен (`.md`-файлы обычно не в `toc.yaml` — там `index.md` папок). Для **папок** — риск.

{% endcut %}
||
||
KI-648
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

`if (!uri) return;` — команда не видна в палитре (`when` только в `explorer/context`), но если программный вызов без `uri` — ничего не произойдёт. Как и `section.*`.

{% endcut %}
||
||
KI-649
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`fs.statSync` без `try/catch`
|
{% cut "Развернуть" %}

<code>
const isDirectory = fs.statSync(deletedPath).isDirectory();
</code>

Если файл исчез между кликом и вызовом (race condition, параллельное удаление в другом окне VS Code) — `throw` `ENOENT`. Внешний `try/catch` **отсутствует** — исключение уйдёт в консоль VS Code, пользователь увидит общую ошибку расширения.

{% endcut %}
||
||
KI-650
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`removeFileOrDirectory` с `force: true` — тихое «успешно»
|
{% cut "Развернуть" %}

Та же проблема, что в `section.Delete`:

<code>
if (isDirectory) {
    fs.rmSync(deletedPath, { recursive: true, force: true });
}
</code>

`force: true` не бросает при неудаче (нет прав, файл занят). Модуль после вызова показывает «Папка удалена». Пользователь считает, что удалено, а на диске осталось.

Для файлов (`fs.unlinkSync`) — бросает, `catch` ловит.

{% endcut %}
||
||
KI-652
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`references` — только inline-ссылки
|
{% cut "Развернуть" %}

`parseMarkdownLinks` использует regex `(!?)\[([^65]]*)\]\(([^66]+)\)`. Не находит:

- **reference-style** (`[text][ref]` + `[ref]: url`);
- **HTML-ссылки** (`<a href>`);
- **wiki-links** (`[[path]]`).

Ссылки в этих форматах не будут заменены на `**удалено**`. `@diplodoc/cli` упадёт на битых ссылках.

{% endcut %}
||
||
KI-653
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`FileDeleteMessageBuilder.footer` — пустой
|
{% cut "Развернуть" %}

`SectionDeleteMessageBuilder.footer()` возвращает `«Ссылки внутри удаляемого раздела и его подразделов игнорируются…»`. `FileDeleteMessageBuilder.footer()` — `''`.

Для **файла** это логично (нет внутренних ссылок). Для **папки** — скрывает, что ссылки между статьями удаляемой папки **не** обновляются (это правильно — они удаляются вместе с папкой). Пользователь может удивиться: «Почему в диффе не видно ссылок между этими файлами?» — потому что эти файлы удалены.

{% endcut %}
||
||
KI-654
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`FileDeleteMessageBuilder` переиспользует `plugin.section.delete.confirmation.text`
|
{% cut "Развернуть" %}

<code>
introduction() {
    if (this.isDirectory) {
        return translate(nls_ts.plugin.section.delete.confirmation.text, this.targetName);
    }
    return translate(nls_ts.crossref.plural.file.confirm.header, this.targetName);
}
</code>

Для **папки** — `«Удалить раздел «<name>» и всё его содержимое безвозвратно?»`. Слово «раздел» для не-секции вводит в заблуждение: пользователь удаляет папку `_drafts/`, а видит «Удалить раздел». NLS-ключ от `section.Delete`.

{% endcut %}
||
||
KI-655
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
Кнопка `«Удалить»` — не из NLS
|
{% cut "Развернуть" %}

<code>
const confirm = await vscode.window.showWarningMessage(message, { modal: true }, 'Удалить');
</code>

Захардкожено на русском. В `en`-локали VS Code — пользователь увидит русскую кнопку. `section.Delete` использует `translate(nls_ts.plugin.section.delete.confirmation.title)` — тоже русское, но через NLS.

{% endcut %}
||
||
KI-656
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
Сообщение об успехе — захардкожено
|
{% cut "Развернуть" %}

<code>
vscode.window.showInformationMessage(
    isDirectory
        ? `Папка "${targetName}" успешно удалена.`
        : `Файл "${targetName}" успешно удалён.`
);
</code>

Не через NLS. В `en`-локали — русский текст.

{% endcut %}
||
||
KI-657
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`getLanguageRoot` может вернуть не-корень-языка
|
{% cut "Развернуть" %}

Та же проблема, что в `section.Delete`/`section.Move`: если по пути есть папка без `index.md` с `toc.yaml`, `getLanguageRoot` вернёт её. Тогда `findFiles`/`updateLinksInProject` работают в узком scope.

{% endcut %}
||
||
KI-658
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`references` может быть пустым для файла с само-ссылками
|
{% cut "Развернуть" %}

`findReferencesToMdFile` пропускает сам `targetFilePath`:

<code>
for (const filePath of allMdFiles) {
    if (filePath === targetFilePath) continue;
    // …
}
</code>

Если файл ссылался только на себя (self-references), они не считаются. Ожидаемо (файл удаляется).

{% endcut %}
||
||
KI-659
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
Двойной вызов `findDirectories`
|
{% cut "Развернуть" %}

`findReferencesToMdSection` вызывает `findDirectories(targetFolderPath, '.md')`. Потом `updateLinksAfterFolderDelete` — **ещё раз** `findDirectories(deletedPath, '.md')`. Для 1000 `.md` — двойная работа. См. `section.Delete` — то же самое.

{% endcut %}
||
||
KI-660
|
unknown
|
major
|
[`МодульУдалениефайла`](../МодульУдалениефайла/index.md)
|
`FileDeleteMessageBuilder` — `introduction` для папки-не-секции
|
{% cut "Развернуть" %}

Слово «раздел» для произвольной папки (например, `docs/ru/_drafts/`) — вводит в заблуждение. Пользователь ожидает «Удалить папку», видит «Удалить раздел». Не баг, но UX-несоответствие.

{% endcut %}
||
||
KI-661
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`.jpeg`, `.gif`, `.webp` — команда не видна
|
{% cut "Развернуть" %}

`when` покрывает только `.png`, `.jpg`, `.svg`. Если пользователь кликает на `.jpeg` или `.webp` — `smart.delete` **не появляется** в контекстном меню. Пользователь удаляет через стандартный `Delete` в VS Code — без очистки ссылок.

Расширить `when` на `.jpeg`, `.gif`, `.webp` — одна строка. Рассинхрон с `isImage` в `link.Copy` (там все шесть покрыты).

{% endcut %}
||
||
KI-662
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`fs.existsSync` → `fs.statSync` — race condition
|
{% cut "Развернуть" %}

<code>
if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() && isDiplodocSection(targetPath)) {
</code>

`fs.existsSync` проверяет существование, `fs.statSync` — тип. Между ними микросекунды — если файл удалён в другом окне, `statSync` бросит `ENOENT`. Внешний `try/catch` отсутствует. Исключение уйдёт в консоль VS Code.

Правильно — `try { const stat = fs.statSync(targetPath); … } catch { /* file.Delete сам разберётся */ }`. Или — убрать `existsSync`, полагаться на `statSync` в `file.Delete`.

{% endcut %}
||
||
KI-663
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`file.Delete` при несуществующем пути — `throw`
|
{% cut "Развернуть" %}

Если `smart.delete` вызван на несуществующем пути (`existsSync === false`), маршрут — `file.Delete`. Внутри:

<code>
const isDirectory = fs.statSync(deletedPath).isDirectory();
</code>

`fs.statSync` бросит `ENOENT`. Внешний `catch` в `ux_file_delete` **отсутствует** до `fs.statSync`. Исключение уйдёт наружу.

Практически: Explorer кэширует, между кликом и вызовом файл может исчезнуть — редко, но возможно.

{% endcut %}
||
||
KI-664
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
Папка-не-секция без `toc.yaml` — `file.Delete` не чистит `toc.yaml`
|
{% cut "Развернуть" %}

Если пользователь удаляет папку `_drafts/` (не секция, но в `toc.yaml` родителя есть запись через `include.path`), `smart.delete` → `file.Delete`. `file.Delete` **не** вызывает `TocYamlEntryRemove`. Запись в `toc.yaml` остаётся. `@diplodoc/cli` упадёт при сборке.

Это ограничение `file.Delete`, а не `smart.delete`, но проявляется именно через `smart.delete` — потому что пользователь ожидает «очистить всё», а `toc.yaml` не чистится.

Правильно — `smart.delete` мог бы **дополнительно** проверять: если удаляется папка, и в `toc.yaml` родителя есть запись с `href`, начинающимся с `<folderName>/`, — вызвать `TocYamlEntryRemove` перед `file.Delete`. Или — расширить `file.Delete` (не `section.Delete`).

{% endcut %}
||
||
KI-665
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`ux_smart_delete` не логирует маршрут
|
{% cut "Развернуть" %}

В `console.log` ничего не пишется. Если пользователь удалил папку и не понимает, почему ссылки из `toc.yaml` не очистились (потому что это была не-секция) — диагностики нет. `smart.delete` «молча» выбрал `file.Delete`.

Правильно — `console.log('[SmartDelete] Маршрутизация → file.Delete (не-секция)')`. Не для пользователя, для отладки.

{% endcut %}
||
||
KI-666
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`return ux_*` — VS Code-команда не ждёт
|
{% cut "Развернуть" %}

<code>
async function ux_smart_delete(uri) {
    // …
    return ux_section_delete(uri);
}
</code>

`ux_smart_delete` — `async`, возвращает `Promise<…>` (результат внутренней). VS Code при `registerCommand` не ждёт `Promise` — команда считается «выполненной» сразу. Если `section.Delete` упадёт (например, `fs.renameSync` бросит), исключение уйдёт в unhandled rejection. Пользователь увидит ошибку в консоли, но **не** в UI (потому что `ux_section_delete` сам ловит и показывает `showErrorMessage`, но `smart.delete` не добавляет своего контекста).

Практически работает: `section.Delete` и `file.Delete` оба имеют внутренний `try/catch` вокруг опасных операций. Но если что-то упадёт **до** `try/catch` (например, `fs.statSync` в `file.Delete`), — молча.

{% endcut %}
||
||
KI-667
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`uri` из палитры — тихий выход
|
{% cut "Развернуть" %}

`if (!uri) return;` — как и в `section.*`/`file.*`. Команда видна только в Explorer, но программный вызов без `uri` — no-op.

{% endcut %}
||
||
KI-668
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`isDiplodocSection` — только по трём файлам
|
{% cut "Развернуть" %}

`isDiplodocSection` проверяет `index.md` + `index.yaml` + `toc.yaml`. Если у пользователя папка-секция без `index.yaml` (старый формат Diplodoc, до введения `index.yaml`) — не распознается как секция, уйдёт в `file.Delete`. `toc.yaml` родителя не будет очищен.

Практически: стандарт Diplodoc требует все три файла. Но если пользователь мигрировал из старой версии — может быть.

{% endcut %}
||
||
KI-669
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
Отсутствие обратной совместимости в заголовке
|
{% cut "Развернуть" %}

В контекстном меню пользователь видит **«Удалить, очищая ссылки»**. Это не говорит, что именно произойдёт:

- для секции — с очисткой `toc.yaml`;
- для файла — без `toc.yaml`.

Пользователь может ожидать одинакового поведения. Разница проявляется только после сборки (для секции — успех, для не-секции-папки — падение `@diplodoc/cli`).

{% endcut %}
||
||
KI-670
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`smart.delete` не экспортируется из `diplodoc-helper-cli.js`
|
{% cut "Развернуть" %}

В `module.exports` файла `diplodoc-helper-cli.js` — нет `ux_smart_delete` (это VS Code-команда, не CLI). Логично. Но и `section.Delete`/`file.Delete` не экспортируются. Для внешних интеграций — неудобно.

{% endcut %}
||
||
KI-671
|
unknown
|
major
|
[`МодульУмноеудаление`](../МодульУмноеудаление/index.md)
|
`smart.delete` — единственная точка входа для `file.Delete`
|
{% cut "Развернуть" %}

`diplodoc-helper.file.delete` зарегистрирован в `contributes.commands` (заголовок «Удалить файл, очищая ссылки»), но **не** в `menus`. То есть команда доступна только через `commands.executeCommand('diplodoc-helper.file.delete', uri)` или через `smart.delete`. Пользователь не может вызвать `file.Delete` напрямую.

Если пользователь **хочет** удалить файл без очистки `toc.yaml` (что странно, но возможно) — только через `commands.executeCommand`. Или через стандартный `Delete` VS Code (без очистки ссылок вообще).

Это осознанное решение (одна команда для пользователя, остальное — внутренняя маршрутизация), но снижает гибкость.

{% endcut %}
||
||
KI-672
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
Два разных движка YAML
|
{% cut "Развернуть" %}

`sections.core` использует **два** пакета для работы с YAML:

- `yaml` (`YAML.stringify`) — в `yaml.base.js`, `yaml.toc.entry.js`, `yaml.toc.sort.js`. Форматирует с дефисами, отступами 2, без выравнивания по `:`.
- `js-yaml` (`yaml.dump`) — в `yaml.index.entry.js` (частично). Форматирует с `>`-многострочными строками.

Результат: `toc.yaml` и `index.yaml` могут иметь **разный стиль** после разных операций. Особенно заметно в `IndexYamlEntryPatchSection` (regex) vs `IndexYamlEntryPatch` (js-yaml.dump) — они могут давать разный вид одного и того же файла.

Практический эффект: если пользователь часто переименовывает секции, `index.yaml` мигает между двумя форматами. Не баг (синтаксис YAML валиден в обоих), но diff в git выглядит шумно.

{% endcut %}
||
||
KI-673
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`TEMPLATE_FINAL_TITLE` и `composeFullTitle` — разная логика для одного результата
|
{% cut "Развернуть" %}

`TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title)`:

<code>
if (!sectionValue &#124;&#124; sectionValue.trim() === '') return title;
const leftPart = sectionIndex.trim().length === 0 ? sectionValue : `${sectionValue} ${sectionIndex.trim()}`;
return `${leftPart}. ${title}`;
</code>

`composeTitlePrefix(index, sectionType)`:

<code>
const hasPrefix = !!sectionType.value;
const hasIndex = !!index;
if (hasPrefix && hasIndex) return `${sectionType.value} ${index}. `;
if (hasPrefix && !hasIndex) return sectionType.value;
if (!hasPrefix && hasIndex) return `${index}. `;
return '';
</code>

`composeFullTitle` → `prefix + pureTitle`.

Оба используются в `sections.core` (первый — в `yaml.base` и `md.index.file`, второй — в `diplodoc.flow` и командах). Разница: `TEMPLATE_FINAL_TITLE` **не добавляет точку после `sectionValue`**, если `sectionIndex` пуст. `composeFullTitle` — тоже (см. `hasPrefix && !hasIndex` → `return sectionType.value`, без точки). Совпадает.

Но если `sectionValue = 'Раздел'` (без пробела), `TEMPLATE_FINAL_TITLE` даст `"Раздел1. Введение"`, а `composeFullTitle` — `"Раздел 1. Введение"` (с пробелом). То есть один и тот же вход — разные результаты. Дублирование логики ведёт к рассинхронизации при правке одной функции.

{% endcut %}
||
||
KI-674
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`isIndexedSectionType` не согласован с `FrontMatterSectionTypesIndexed`
|
{% cut "Развернуть" %}

В `frontmatter.section.title.js`:

<code>
function isIndexedSectionType(sectionType) {
    return FrontMatterSectionTypesIndexed.includes(sectionType.name);
}
</code>

`FrontMatterSectionTypesIndexed` включает `Part`, `Section`, `Chapter`, **`Page`**. Но `Page` — статья, у неё нет `sectionIndex`, `isIndexedSectionType` для `Page` вернёт `true`. Используется в `section.Rename`:

<code>
if (!isIndexedSectionType(newSectionTypeObj)) {
    finalIndex = '';
}
</code>

Для `Page` (статьи) `isIndexedSectionType` вернёт `true` — `finalIndex` не сбросится, что семантически неверно (статья не индексируется). В коде это компенсируется тем, что `promptSection` сам не запрашивает индекс для `Page` (проверяет `FrontMatterSectionTypesIndexed2`). Но `isIndexedSectionType` формально «врёт» для `Page`.

{% endcut %}
||
||
KI-676
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`DiplodocSectionPatch` не удаляет старые `index.yaml`/`toc.yaml` при переименовании в другой тип
|
{% cut "Развернуть" %}

Если пользователь меняет `Статья → Раздел`, `TEMPLATE_FOLDER_NAME` даёт другое имя (`Введение` → `Раздел1.Введение`). `fs.renameSync` переносит **всю** папку, включая `index.yaml` и `toc.yaml`. `TocYamlEntryPatchTitle` переписывает `title` в `toc.yaml`, `IndexMdUpsert` переписывает `index.md`. Но `index.yaml` — только через `IndexYamlEntryPatch`, а тот использует regex по `title`/`description`. Если в старом `index.yaml` не было поля `pureTitle` (только `title`), `IndexYamlEntryPatchSection` не создаст `pureTitle`, а `IndexYamlEntryPatch` — создаст. Несогласованность между двумя функциями.

Практический эффект: после переименования `Статья → Раздел` в `index.yaml` может остаться неполный набор полей. Не критично (`@diplodoc/cli` не читает `pureTitle`), но `section.Rename` со временем накапливает «грязные» `index.yaml`.

{% endcut %}
||
||
KI-677
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`getSectionMetadata` читает через `get()` — с `null` по умолчанию
|
{% cut "Развернуть" %}

<code>
function getSectionMetadata(content) {
    return {
        sectionType: get(content, 'sectionType'),          // null если нет
        pureTitle: get(content, 'pureTitle') &#124;&#124; get(content, 'title'),
        sectionIndex: get(content, 'sectionIndex'),        // null если нет
    };
}
</code>

Для статьи без `sectionType` — `null`. Для `String(null)` — `'null'`. В `reindexer.directories` это обрабатывается:

<code>
const sectionTypeObj = localSectionTypes.find(st => st.name === metadata.sectionType) &#124;&#124; DEFAULT_SECTION_TYPE;
</code>

`DEFAULT_SECTION_TYPE` — `Page`. То есть статья без `sectionType` попадёт в `Page`, не в ошибку. Работает, но `console.warn` о «не найден sectionType» не выводится (метаданные содержат `null` — `checkMissingSectionType` проверяет `!metadata.sectionType`, сработает).

{% endcut %}
||
||
KI-678
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`sortTocItems` при `sortOrder = 'none'` — не сортирует, но перезаписывает файл
|
{% cut "Развернуть" %}

<code>
if (tocDoc && sortOrder !== 'none') {
    sortTocItems(dir, sortOrder, sortKind);
}
</code>

Проверка `sortOrder !== 'none'` стоит **перед** вызовом, но `sortTocItems` тоже пишет файл в любом случае. В `reindexDirectory` — правильно (проверка снаружи). Но если кто-то вызовет `sortTocItems(dir, 'none')` напрямую — получит `YAML.stringify`-нормализацию (не сортировку, но переформатирование). Не баг, но неочевидно.

{% endcut %}
||
||
KI-679
|
unknown
|
major
|
[`МодульЯдросекций`](../МодульЯдросекций/index.md)
|
`getIndexFromBlock` в `yaml.toc.utils.js` — парсит блок из текста, а не YAML
|
{% cut "Развернуть" %}

<code>
const hrefMatch = block.match(/href:\s+([^68]+)/);
</code>

Если `href` содержит `/` (`foo/bar/index.md`), match обрежется на `/` — вернёт `foo`. Эта функция, к счастью, **не используется** в текущем пайплайне (`TocYamlEntry*` работают через `YAML.parse`). Но если кто-то её вызовет — получит неверный результат. Мёртвый код с багом.

{% endcut %}
||
||
KI-680
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Регулярка ловит только числовые id
|
{% cut "Развернуть" %}

`fn(?:ref)?\d+` — только `fn1`, `fn2`, `fnref10`. Если `@diplodoc/cli` (или будущая версия) начнёт генерировать `id="fn-abc"` (буквенные или с дефисами), модуль их не тронет. Молча: `totalFixed` посчитает изменённые файлы, но не изменённые ссылки. Ни ошибки, ни предупреждения.

{% endcut %}
||
||
KI-681
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Зависимость от `<link rel="canonical">`
|
{% cut "Развернуть" %}

Если у страницы нет canonical — файл полностью пропускается. В Diplodoc это стандартное поведение (canonical из `baseUrl`), но:

- если `baseUrl` не задан в `.yfm` — canonical может отсутствовать или указывать на относительный путь (например, `/ru/foo/`). Тогда `href="<relative>#fn1"` — формально абсолютный URL от корня сайта, но всё равно не работает при `file://`;
- `404.html` и служебные страницы canonical не имеют — пропускаются (что правильно).

{% endcut %}
||
||
KI-682
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
`replace` не различает контекст
|
{% cut "Развернуть" %}

`href="#fn1"` заменяется **везде** в файле — включая, например, произвольные ссылки, которые пользователь вручную добавил в текст и которые случайно совпадают с паттерном. Вероятность низкая (пользователь должен написать `href="#fn1"` в своей статье), но при использовании собственных `<a href="#fn1">` в разметке модуль их «приватизирует» — превратит в абсолютную ссылку на текущую страницу. Семантически почти то же самое (обе ведут на `#fn1` той же страницы), но визуально в исходнике меняется.

{% endcut %}
||
||
KI-683
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Модуль не идемпотентен на повторном вызове
|
{% cut "Развернуть" %}

Каждый запуск делает `replace` заново. Если запустить дважды:

1. Первый запуск: `href="#fn1"` → `href="https://…/index.html#fn1"`.
2. Второй запуск: `href="#fn1"` не найдётся (уже абсолютный), `href="https://…/index.html#fn1"` тоже не подойдёт под регулярку (нет `#` сразу после `"`). Ничего не меняется — файл не перезаписывается (`html !== original` не сработает).

Так что **фактически** идемпотентен, но `totalFixed` во втором запуске будет `0`. Если запускать в цикле (например, watch-режим), это может сбивать с толку — «я же только что запускал, а он говорит, что ничего не сделал».

{% endcut %}
||
||
KI-684
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Канонический URL берётся «как есть»
|
{% cut "Развернуть" %}

`canonical` может содержать query-параметры, `#hash` (маловероятно), неверный регистр. Модуль не нормализует: если `<link rel="canonical" href="https://example.com/ru/foo/index.html?utm=x">`, то и `href` будет с `?utm=x#fn1` — кривовато, но работает.

Если canonical — относительный (`/ru/foo/index.html`), модуль всё равно использует его. Тогда `href="#fn1"` превратится в `href="/ru/foo/index.html#fn1"` — абсолютный от корня сайта, но не от корня домена. При `file://`-открытии это всё ещё не сработает.

{% endcut %}
||
||
KI-685
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Не пишет `totalFixed` в консоль в CLI-режиме
|
{% cut "Развернуть" %}

Внутри функции:

<code>
console.log(`[FootnoteAnchors] Исправлено файлов: ${totalFixed}`);
</code>

В CLI это попадает в stdout. Но если запускать через `docs-build.js`, лог перемешивается с другими шагами (`▶ [post] footnoteAnchors`, `✓ footnoteAnchors (0.42s)`). «Исправлено файлов: N» может затеряться. Стоит выводить через тот же префикс `[post] footnoteAnchors: N файлов`, как делают другие модули.

{% endcut %}
||
||
KI-686
|
unknown
|
major
|
[`МодульЯкорясносок`](../МодульЯкорясносок/index.md)
|
Симметрия с `mdedit_fixes/fix-footnote-links.js`
|
{% cut "Развернуть" %}

В `src/plugins/mdedit_fixes/fix-footnote-links.js` есть **клиентский** скрипт, который делает похожее:

<code>
document.querySelectorAll('.footnote-ref a[href^="#fn"]').forEach(function (link) {
    var hash = link.getAttribute('href');
    if (hash && hash[0] === '#') {
        link.href = currentPath + hash;
    }
});
</code>

То есть там тот же фикс, но на клиенте, в браузере, через `window.location.pathname`. Два подхода к одной задаче:

- **`footnoteAnchors`** — на этапе сборки, всегда, для всех;
- **`mdedit_fixes`** — на клиенте, только если скрипт подключён.

Потенциальный конфликт: если оба сработают на одном документе, `mdedit_fixes` увидит уже-абсолютный `href` (не начинается с `#`) и не тронет его (`if (hash && hash[0] === '#')` — не пройдёт). Так что конфликта нет — `footnoteAnchors` выигрывает, `mdedit_fixes` работает как fallback для тех страниц, где `footnoteAnchors` не отработал.

Но это стоит держать в голове: если отлаживаешь якоря — сначала проверь, кто именно «починил»: `footnoteAnchors` (в HTML) или `mdedit_fixes` (в браузере).

{% endcut %}
||
|#
