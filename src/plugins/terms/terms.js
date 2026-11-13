// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { walkMdFilesGetTerms } = require('./terms.collector');
const { writeTermsIndex } = require('./terms.writer');
const TERM_CONFIG = require('./terms.config.js');
const { getTermOutputDir, getTermLanguages } = require('./terms.paths');
const { createLogger } = require('../utils/logger');

/**
 * @param {string} docsRoot
 */
function runGeneration(docsRoot) {
    const results = { success: [], failed: [] };
    const log = createLogger('terms');

    for (const lang of getTermLanguages()) {
        const langDir = path.join(docsRoot, lang);
        if (!fs.existsSync(langDir)) continue;

        try {
            const termMap = walkMdFilesGetTerms(langDir);
            const all = Object.values(termMap);
            const definedCount = all.filter(a => a.definedInDictionary).length;
            const orphanCount = all.length - definedCount;
            const usedCount = all.filter(a => a.rank > 0).length;

            if (all.length === 0) {
                log.info(`[terms] ${lang}: ни словаря, ни разметки <abbr class="term"> — пропуск.`);
                continue;
            }

            const outputDir = getTermOutputDir(langDir, lang);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            writeTermsIndex(outputDir, termMap, lang, TERM_CONFIG);
            log.info(`[terms] ${lang}: ${definedCount} в словаре, ${orphanCount} вне словаря, ${usedCount} используется → ${outputDir}`);
            results.success.push(lang);
        } catch (err) {
            log.error(`❌ [terms] Ошибка для ${lang}:`, err);
            results.failed.push(lang);
        }
    }

    return results;
}

module.exports = { runGeneration };
