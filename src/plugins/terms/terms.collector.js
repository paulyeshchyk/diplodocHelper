// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { extractTermsFromFile } = require('./terms.extractor');
const { loadTermDictionary } = require('./terms.dictionary');
const { getTermOutputDir } = require('./terms.paths');

const SKIP_DIRS = new Set(['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap']);

/**
 * @param {string} langDir
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

    /**
     * @param {string} dir
     */
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (skipFullPaths.has(path.resolve(fullPath))) continue;
                if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
                    walk(fullPath);
                }
            } else if (entry.name.endsWith('.md')) {
                try {
                    const result = extractTermsFromFile(fullPath, langDir);
                    if (!result) continue;
                    for (const [term, count] of result.occurrences) {
                        if (!termMap[term]) {
                            termMap[term] = {
                                term,
                                definition: '',
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
            }
        }
    }

    walk(langDir);

    for (const termId of Object.keys(termMap)) {
        termMap[termId].pages.sort((a, b) => b.occurrences - a.occurrences);
    }
    return termMap;
}

module.exports = { walkMdFilesGetTerms };
