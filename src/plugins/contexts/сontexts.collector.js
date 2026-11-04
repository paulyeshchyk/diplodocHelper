const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const { extractContextTagValue } = require('./contexts.extractor');

/** @typedef {import('./contexts.types.ts').ContextMap} ContextMap */

const SKIP_DIRS = new Set(['contexts']);

/**
 * @param {string} langDir
 * @returns {ContextMap}
 */
function walkMdFilesGetContexts(langDir) {
    /** @type {ContextMap} */
    const contextMap = {};

    Fs_Walk_Directory.walkSync({
        dir: langDir,
        skipHidden: false,
        skipUnderscore: false,
        skipDirNames: SKIP_DIRS,
        filterFile: fullPath => fullPath.endsWith('.md'),
        onFile: fullPath => extractContextTagValue(fullPath, langDir, contextMap),
    });

    return contextMap;
}

module.exports = { walkMdFilesGetContexts };