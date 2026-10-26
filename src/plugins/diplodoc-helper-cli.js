#!/usr/bin/env node

// @ts-nocheck
// diplodoc-helper-cli.js
const path = require('path');
const fs = require('fs');
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

// Если запускают как cli
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

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
    } else if (command === 'terms') {
        generateTerms(docsDir);
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
    } else if (command === 'breadcrumb') {
        generateBreadcrumb(outputDir);
    } else if (command === 'tocCleanMode') {
        generateTocCleanMode(outputDir);
    } else if (command === 'ganttFixScroll') {
        generateGanttFixScroll({ docsRoot: outputDir, engine: DiagramEngine.MERMAID });
    } else if (command === 'reindexFootnotes') {
        reindexFootnotes(docsDir);
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
};
