// @ts-nocheck
const { Fs_Walk_Directory } = require('../utils/fs/Fs_Walk_Directory.ts');
const path = require('path');
const { extractTermsFromFile } = require('./terms.extractor');
const { loadTermDictionary } = require('./terms.dictionary');
const { getTermOutputDir } = require('./terms.paths');

/** @typedef {import('./terms.types.ts').TermMap} TermMap */

const SKIP_DIRS = new Set(['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap']);

/**
 * @param {string} langDir
 * @returns {TermMap}
 */
function walkMdFilesGetTerms(langDir) {
    const dictionary = loadTermDictionary(langDir);

    /**
     * @type {Set<any>}
     */
    let skipFullPaths;
    try {
        skipFullPaths = new Set([path.resolve(getTermOutputDir(langDir))]);
    } catch (err) {
        console.warn(err instanceof Error ? err.message : String(err));
        skipFullPaths = new Set();
    }

    /** @type {TermMap} */
    const termMap = {};

    for (const def of dictionary.values()) {
        termMap[def.term] = {
            term: def.term,
            definition: def.definition,
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
                const result = extractTermsFromFile(fullPath, langDir);
                if (!result) return;

                for (const [term, count] of result.occurrences) {
                    if (!termMap[term]) {
                        termMap[term] = {
                            abbr: term,
                            full: '',
                            category: undefined,
                            description: undefined,
                            definedInDictionary: false,
                            rank: 0,
                            totalOccurrences: 0,
                            pages: [],
                        };
                    }
                    termMap[term].rank += 1;
                    termMap[term].totalOccurrences += count;
                    termMap[term].pages.push({
                        title: result.title,
                        href: result.href,
                        occurrences: count,
                    });
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`❌ [terms] Ошибка обработки ${fullPath}:`, msg);
            }
        },
    });


    for (const termId of Object.keys(termMap)) {
        termMap[termId].pages.sort((a, b) => b.occurrences - a.occurrences);
    }
    return termMap;
}

module.exports = { walkMdFilesGetTerms };
