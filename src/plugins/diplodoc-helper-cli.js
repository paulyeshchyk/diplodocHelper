#!/usr/bin/env node

// @ts-nocheck
// diplodoc-helper-cli.js
const path = require('path');
const fs = require('fs');

/**
  * Ищет вверх от `start` папку-корень проекта документации.
  *
  * Возвращает `PROJECT_ROOT`, от которого `_paths.ts` считает
  * `DOCS_DIR = <PROJECT_ROOT>/docs`.
  *
  * Два сценария (проверяются в порядке приоритета):
  *
  *   1. **Repo extension layout** — вверх находится папка `<X>`,
  *      содержащая `<X>/docs/docs/`. Значит `<X>/docs` — это docs-проект
  *      (обёртка над реальной docs), и правильный `PROJECT_ROOT = <X>/docs`.
  *      Пример: `<repo>/src/plugins/docs-registry` → `<repo>/docs`.
  *
  *   2. **Standalone docs project** — вверх находится папка `<X>`,
  *      содержащая `<X>/docs/_registry/` или `<X>/docs/_generated/`.
  *      Значит `<X>/docs` — это реальная docs, а `PROJECT_ROOT = <X>`.
  *      Пример: `<target>/plugins/docs-registry` → `<target>`.
  *
  * Возвращает `null`, если ни один сценарий не сработал. Тогда
  * `_paths.ts` возьмёт `process.cwd()` как fallback (dev из произвольной
  * директории — работает только с явным `--docs-project-root`).
  */
function findProjectRoot(start) {
    let cur = path.resolve(start);

    // 1. Repo extension layout: <X>/docs/docs/ → PROJECT_ROOT = <X>/docs
    while (cur && cur !== path.dirname(cur)) {
        if (fs.existsSync(path.join(cur, 'docs', 'docs'))) {
            return path.join(cur, 'docs');
        }
        cur = path.dirname(cur);
    }

    // 2. Standalone docs project: <X>/docs/_registry или <X>/docs/_generated
    cur = path.resolve(start);


    while (cur && cur !== path.dirname(cur)) {
        const docsDir = path.join(cur, 'docs');
        if (
            fs.existsSync(path.join(docsDir, '_registry')) ||
            fs.existsSync(path.join(docsDir, '_generated'))
        ) {
            return cur;
        }
        cur = path.dirname(cur);
    }

    return null;
}


// ── prelude: --docs-project-root должен быть известен ДО первого require
//    модуля, транзитивно подтягивающего `_paths.js` (кешируется Node).
//    Поддерживаем обе формы: '--docs-project-root=<path>' и
//    '--docs-project-root <path>'.
const __args = process.argv.slice(2);
for (let i = 0; i < __args.length; i++) {
    const a = __args[i];
    if (a.startsWith('--docs-project-root=')) {
        process.env.DOCS_PROJECT_ROOT = a.slice('--docs-project-root='.length);
        __args.splice(i, 1);
        break;
    }
    if (a === '--docs-project-root' && __args[i + 1]) {
        process.env.DOCS_PROJECT_ROOT = __args[i + 1];
        __args.splice(i, 2);
        break;
    }
}

// Fallback: если флаг не передан — вычисляем от `__dirname` CLI (CJS — работает).
// `_paths.ts` (ESM) полагается на этот env и больше не пытается вычислить
// свой путь сам.
if (!process.env.DOCS_PROJECT_ROOT) {
    const guessed = findProjectRoot(__dirname);
    if (guessed) process.env.DOCS_PROJECT_ROOT = guessed;
}

// ─────────────────────────────────────────────────────────────────────────

const featureMapPluginDir = path.join(__dirname, 'docs-registry', 'emit-feature-map');

const { runGeneration: generateHelpMap } = require('./helpMap/helpmap.js');
const { runGeneration: generateContexts } = require('./contexts/сontexts.js');
const { runGeneration: generateHelptags } = require('./helptags/helptags.js');
const { runGeneration: generateBreadcrumb } = require('./breadcrumb/breadcrumb.js');
const { runGeneration: generateContexttags } = require('./context-tags/context-tags.js');
const { injectCleanMode: generateTocCleanMode } = require('./tocCleanMode/post-build.js');
const { reindexFigures } = require('./reindexer/reindexer.figures.js');
const { DiplodocConfigFromCli } = require('../plugins/manifest/config/diplodoc.config.js');
const { fixFootnoteAnchors } = require('./footnoteAnchors/fix-footnote-anchors.js');
const { runGeneration: generateNavigationContent } = require('./contentNavigator/generateNavigationContent.js');
const { runGeneration: generateRoadMap, DiagramEngine } = require('./roadMap/roadmap');
const { runGeneration: generateGanttFixScroll } = require('./roadMap/post-build');
const { CONFIG_KEY } = require('../plugins/manifest/constants.js');
const { runGeneration: generateFigures } = require('./figures/figures.js');
const { reindexFootnotes } = require('./reindexer/reindexer.footnotes.js');
const { renumberFootnotes } = require('./footnoteNumbering/renumber-footnotes.js');
const { runGeneration: generateAbbrs } = require('./abbrs/abbrs.js');
const { runGeneration: injectAbbrTitles } = require('./abbrs/abbrs.injector.js');
const { runGeneration: generateTerms } = require('./terms/terms.js');
const { runGeneration: injectTermTitles } = require('./terms/terms.injector.js');
const { runGeneration: generateGosts } = require('./gosts/gosts.js');
const { runGeneration: generateComments } = require('./comments/comments.js');
const { convertJsonToMdTable } = require('./json-to-md/json-to-md-table.js');
const { runEmitFeatureMap } = require('./docs-registry/emit-feature-map/index.ts');
const { runGeneration: injectFeatureMap } = require('./docs-registry/emit-feature-map/feature-map.injector.ts');

const { injectGostsTable } = require('./gosts/gosts.injector.js');
// Если запускают как cli
if (require.main === module) {
    const args = __args;
    const command = args[0];

    const asyncHandlers = {
        catalog: { path: './docs-registry/collect-catalog/index.ts', fn: 'runCollectCatalog' },
        pageLegend: { path: './docs-registry/build-page-legend/index.ts', fn: 'runBuildPageLegend' },
        renderModules: { path: './docs-registry/render-modules/index.ts', fn: 'runRenderModules' },
        emitModulesTable: { path: './docs-registry/emit-modules-table/index.ts', fn: 'runEmitModulesTable' },
    };
    const asyncH = asyncHandlers[command];
    if (asyncH) {
        const mod = require(asyncH.path);
        mod[asyncH.fn](args.slice(1))
            .catch(e => { console.error(e.message || e); process.exit(1); });
    }


    const docsDirIndex = args.indexOf('--docsDir');
    const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';

    const outputDirIndex = args.indexOf('--outputDir');
    const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : './build';

    const segregation = args.includes('--segregation');

    if (command === 'helpMap') {
        generateHelpMap({ docsDir, outputDir, segregation });
    } else if (command === 'periodicStat') {
        generateNavigationContent({ mapDir: outputDir, outputDir: outputDir, command: command, docsDir: docsDir });
    } else if (command === 'periodicTable') {
        generateNavigationContent({ mapDir: outputDir, outputDir: outputDir, command: command, docsDir: docsDir });
    } else if (command === 'periodicTableHelpTag') {
        generateNavigationContent({ mapDir: outputDir, outputDir: outputDir, command: command, docsDir: docsDir });
    } else if (command === 'periodicTableContext') {
        generateNavigationContent({ mapDir: outputDir, outputDir: outputDir, command: command, docsDir: docsDir });
    } else if (command === 'reindexFigures') {
        const { targetLocale, configObj } = DiplodocConfigFromCli(CONFIG_KEY);
        reindexFigures(docsDir, targetLocale, configObj);
    } else if (command === 'createFigureContent') {
        generateFigures(docsDir);
    } else if (command === 'abbrs') {
        generateAbbrs(docsDir);
    } else if (command === 'abbrTitles') {
        injectAbbrTitles({ buildDir: outputDir, docsRoot: docsDir });
    } else if (command === 'jsonToMdTable') {
        const args = process.argv.slice(3);
        // мини-парсер повторяет логику модуля
        const { parseArgs } = require('./json-to-md/json-to-md-table.js'); // если экспортировать
        convertJsonToMdTable(parseArgs(args));
    } else if (command === 'terms') {
        generateTerms(docsDir);
    } else if (command === 'gosts') {
        generateGosts(docsDir);

        // >>> ДОБАВЛЕНА КОМАНДА ИНЖЕКТА ГОСТОВ
    } else if (command === 'gostsInject' || command === 'injectGosts') {
        const sectionIdx = args.indexOf('--section');
        const section = sectionIdx !== -1 ? args[sectionIdx + 1] : 'ГОСТы';
        let targetHtml = null;

        // Если передан --targetHtml, берем его
        const targetHtmlIdx = args.indexOf('--targetHtml');
        if (targetHtmlIdx !== -1) {
            targetHtml = path.resolve(args[targetHtmlIdx + 1]);
        } else {
            // Иначе ищем по названию секции (по умолчанию СправочникГОСТов)
            targetHtml = findSectionIndexHtml(outputDir, section);
        }
        if (!targetHtml || !fs.existsSync(targetHtml)) {
            console.error(`❌ [gosts] HTML файл не найден (секция: "${section}") под ${outputDir}`);
            process.exitCode = 1;
        } else {
            const resolvedDocsDir = path.resolve(docsDir);
            // Определяем язык (ru/en) из последней папки docsDir
            const lang = /^[a-z]{2}$/i.test(path.basename(resolvedDocsDir))
                ? path.basename(resolvedDocsDir)
                : 'ru';
            const r = injectGostsTable({
                langDir: resolvedDocsDir,
                targetHtml,
                lang
            });
            if (!r.success) process.exitCode = 1;
        }
    } else if (command === 'termTitles') {
        injectTermTitles({ buildDir: outputDir, docsRoot: docsDir });
    } else if (command === 'contexts') {
        generateContexts(docsDir);
    } else if (command === 'footnoteAnchors') {
        fixFootnoteAnchors(outputDir);
    } else if (command === 'helptags') {
        generateHelptags(docsDir);
    } else if (command === 'contexttags') {
        generateContexttags(outputDir);
    } else if (command === 'comments') {
        generateComments(outputDir);
    } else if (command === 'breadcrumb') {
        generateBreadcrumb(outputDir);
    } else if (command === 'tocCleanMode') {
        generateTocCleanMode(outputDir);
    } else if (command === 'ganttFixScroll') {
        generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
    } else if (command === 'reindexFootnotes') {
        reindexFootnotes(docsDir);
    } else if (command === 'emitFeatureMap') {
        const opts = {};
        const docsRoot = extractFlag(args, '--docs-root');
        const generated = extractFlag(args, '--generated-dir');
        if (docsRoot) opts.docsDir = docsRoot;
        if (generated) opts.generatedDir = generated;
        runEmitFeatureMap(args.slice(1), opts)
            .catch(e => { console.error(e.message || e); process.exit(1); });
    } else if (command === 'featureMapInject') {
        const buildDirIdx = args.indexOf('--buildDir');
        const buildDir = buildDirIdx !== -1 ? args[buildDirIdx + 1] : outputDir;
        injectFeatureMap(buildDir, { pluginDir: featureMapPluginDir });
    } else if (command === 'footnoteNumbering') {
        renumberFootnotes({ docsDir, outputDir });
    } else if (command === 'roadMap') {
        const docsDirIndex = args.indexOf('--docsDir');
        const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';

        const dataPathIndex = args.indexOf('--dataPath');
        const dataPath = dataPathIndex !== -1 ? args[dataPathIndex + 1] : undefined;

        const dataRawIndex = args.indexOf('--dataRaw');
        const dataRaw = dataRawIndex !== -1 ? args[dataRawIndex + 1] : undefined;

        generateRoadMap({
            docsRoot: docsDir,
            dataPath,
            dataRaw,
            engine: DiagramEngine.MERMAID,
        });
    } else if (command === 'footnoteList') {
        const sectionIdx = args.indexOf('--section');
        const section = sectionIdx !== -1 ? args[sectionIdx + 1] : null;

        let targetHtml = null;
        if (section) {
            targetHtml = findSectionIndexHtml(outputDir, section);
            if (!targetHtml) {
                console.error(`❌ [footnoteList] Секция "${section}" не найдена под ${outputDir}`);
                process.exitCode = 1;
            }
        } else {
            const idx = args.indexOf('--targetHtml');
            if (idx === -1) {
                console.error('❌ [footnoteList] Нужен --section или --targetHtml');
                process.exitCode = 1;
            }
            targetHtml = path.resolve(args[idx + 1]);
        }

        const lastSeg = path.basename(path.resolve(docsDir));
        const langPrefix = /^[a-z]{2}$/i.test(lastSeg) ? lastSeg : null;

        const { injectFootnoteList } = require('./contentNavigator/Pagebuilder.Config.FootnoteList.js');
        const r = injectFootnoteList({ docsDir, targetHtml, langPrefix });
        if (!r.success) process.exitCode = 1;
    }
}

function findSectionIndexHtml(rootDir, sectionName) {
    const stack = [rootDir];
    while (stack.length) {
        const dir = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const e of entries) {
            if (!e.isDirectory()) continue;
            const full = path.join(dir, e.name);

            // сравниваем имена папок без учёта регистра
            if (e.name.toLowerCase() === sectionName.toLowerCase()) {
                const indexHtml = path.join(full, 'index.html');
                if (fs.existsSync(indexHtml)) return indexHtml;
            }
            // не углубляемся в служебные папки
            if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
            stack.push(full);
        }
    }
    return null;
}

// --- helper для парсинга --flag и --flag=value ---
function extractFlag(argv, name) {
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith(name + '=')) return a.slice(name.length + 1);
        if (a === name && argv[i + 1]) return argv[i + 1];
    }
    return null;
}

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
    runCollectCatalog: require('./docs-registry/collect-catalog/index.ts').runCollectCatalog,
    runBuildPageLegend: require('./docs-registry/build-page-legend/index.ts').runBuildPageLegend,
    runRenderModules: require('./docs-registry/render-modules/index.ts').runRenderModules,
    emitModulesTable: require('./docs-registry/emit-modules-table/index.ts').runEmitModulesTable,
};
