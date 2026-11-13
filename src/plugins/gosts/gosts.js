// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadGostDictionary } = require('./gosts.dictionary');
const { writeGostsIndex } = require('./gosts.writer');
const { getGostOutputDir, getGostLanguages } = require('./gosts.paths');
const { createLogger } = require('../utils/logger');

/**
 * @param {string} docsRoot
 */
function runGeneration(docsRoot) {
    const results = { success: [], failed: [] };
    const log = createLogger('gosts');

    for (const lang of getGostLanguages()) {
        const langDir = path.join(docsRoot, lang);
        if (!fs.existsSync(langDir)) continue;

        try {
            const entries = loadGostDictionary(langDir, lang);
            const outputDir = getGostOutputDir(langDir, lang);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            writeGostsIndex(outputDir, entries, lang);
            results.success.push(lang);
        } catch (err) {
            log.error(`Ошибка для ${lang}:`, err);
            results.failed.push(lang);
        }
    }
    return results;
}
module.exports = { runGeneration };