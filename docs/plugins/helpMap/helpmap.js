const path = require('path');
const { collectHelpData } = require('./helpmap.extractor');
const { writeHelpMap } = require('./helpmap.writer');
const { docsFolderName, outputFolderName } = require('./helpmap.config');

/**
 * @param {Object} params
 * @param {string} params.docsDir
 * @param {string} [params.outputDir]
 * @param {boolean} [params.segregation]
 * @returns {import('./helpmap.types').CollectResult}
 */
function runGeneration({ docsDir, outputDir = outputFolderName, segregation = false }) {
    const results = collectHelpData(docsDir);
    if (results.success.length === 0 && results.failed.length === 0) {
        console.warn('No data collected.');
        return results;
    }
    writeHelpMap({ outputDir, entries: results.success, segregation });
    if (results.failed.length > 0) {
        console.warn(`Не удалось обработать ${results.failed.length} файлов`);
    }
    return results;
}

// CLI запуск
if (require.main === module) {
    const projectRoot = process.cwd();
    const results = runGeneration({
        docsDir: path.join(projectRoot, docsFolderName),
        outputDir: outputFolderName,
        segregation: process.argv.includes('--segregate'),
    });
    // при необходимости можно обработать код возврата
    if (results.failed.length > 0) process.exitCode = 1;
} else {
    module.exports = { runGeneration };
}
