const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const path = require('path');
const { extractAbbrsFromFile } = require('./abbrs.extractor');
const { loadAbbrDictionary } = require('./abbrs.dictionary');
const { getAbbrOutputDir } = require('./abbrs.paths');

/** @typedef {import('./abbrs.types.ts').AbbrMap} AbbrMap */

// Легаси-имена на случай старых раскладок и служебные папки.
const SKIP_DIRS = new Set(['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap']);

/**
 * @param {string} langDir
 * @returns {AbbrMap}
*/
function walkMdFilesGetAbbrs(langDir) {
    const dictionary = loadAbbrDictionary(langDir);

    // Папка, где живёт сгенерированный index.md — её сканировать нельзя,
    // иначе счётчики начнут учитывать уже сгенерированные <abbr> из него.
    /**
     * @type {Set<any>}
     */
    let skipFullPaths;
    try {
        skipFullPaths = new Set([path.resolve(getAbbrOutputDir(langDir))]);
    } catch (err) {
        console.warn(err instanceof Error ? err.message : String(err));
        skipFullPaths = new Set();
    }

    /** @type {AbbrMap} */
    const abbrMap = {};

    for (const def of dictionary.values()) {
        abbrMap[def.abbr] = {
            abbr: def.abbr,
            full: def.full,
            category: def.category,
            description: def.description,
            definedInDictionary: true,
            rank: 0,
            totalOccurrences: 0,
            pages: [],
        };
    }


    Fs_Walk_Directory.walkSync({
        dir: langDir,
        skipHidden: true,
        skipUnderscore: true,
        skipDirNames: SKIP_DIRS,
        skipFullPaths,
        filterFile: fullPath => fullPath.endsWith('.md'),
        onFile: fullPath => {
            try {
                const result = extractAbbrsFromFile(fullPath, langDir);
                if (!result) return;

                for (const [abbr, count] of result.occurrences) {
                    if (!abbrMap[abbr]) {
                        abbrMap[abbr] = {
                            abbr,
                            full: '',
                            category: undefined,
                            description: undefined,
                            definedInDictionary: false,
                            rank: 0,
                            totalOccurrences: 0,
                            pages: [],
                        };
                    }
                    abbrMap[abbr].rank += 1;
                    abbrMap[abbr].totalOccurrences += count;
                    abbrMap[abbr].pages.push({
                        title: result.title,
                        href: result.href,
                        occurrences: count,
                    });
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`❌ [abbrs] Ошибка обработки ${fullPath}:`, msg);
            }
        },
    });

    for (const abbrId of Object.keys(abbrMap)) {
        abbrMap[abbrId].pages.sort((a, b) => b.occurrences - a.occurrences);
    }

    return abbrMap;
}

module.exports = { walkMdFilesGetAbbrs };
