const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const { extractHelptagTagValue } = require('./helptags.extractor');

/** @typedef {import('./helptags.types.ts').HelptagMap} HelptagMap */

const SKIP_DIRS = new Set(['helptags', 'contexts']);

/**
 * @param {string} langDir
 * @returns {HelptagMap}
 */
function walkMdFilesGetHelptags(langDir) {
    /** @type {HelptagMap} */
    const helptagMap = {};

    Fs_Walk_Directory.walkSync({
        dir: langDir,
        skipHidden: false,
        skipUnderscore: false,
        skipDirNames: SKIP_DIRS,
        filterFile: fullPath => fullPath.endsWith('.md'),
        onFile: fullPath => extractHelptagTagValue(fullPath, langDir, helptagMap),
    });

    return helptagMap;
}

module.exports = { walkMdFilesGetHelptags };