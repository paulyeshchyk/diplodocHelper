#!/usr/bin/env node
const { runGeneration: generateHelpMap } = require('./helpMap/helpmap.js');
const { runGeneration: generateContexts } = require('./shared/builders/contexts/сontexts.js');
const { runGeneration: generateBreadcrumb } = require('./breadcrumb/breadcrumb.js');
const { injectCleanMode: generateTocCleanMode } = require('./shared/builders/tocCleanMode/post-build.js');
const { reindexFigures } = require('./shared/builders/reindexer/reindexer.figures.js');
const { DiplodocConfigFromCli } = require('../plugins/manifest/config/diplodoc.config.js');
const { CONFIG_KEY } = require('../plugins/manifest/constants.js');

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
    } else if (command === 'reindexFigures') {
        const { targetLocale, configObj } = DiplodocConfigFromCli(CONFIG_KEY);
        reindexFigures(docsDir, targetLocale, configObj);
    } else if (command === 'contexts') {
        generateContexts(docsDir);
    } else if (command === 'breadcrumb') {
        generateBreadcrumb(outputDir);
    } else if (command === 'tocCleanMode') {
        generateTocCleanMode(outputDir);
    }
}

module.exports = {
    generateHelpMap,
    generateContexts,
    generateBreadcrumb,
    generateTocCleanMode,
    reindexFigures,
};
