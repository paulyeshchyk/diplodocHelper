// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadGostDictionary } = require('./gosts.dictionary');
const { writeGostsIndex } = require('./gosts.writer');
const { getGostOutputDir, getGostLanguages } = require('./gosts.paths');

/**
 * @param {string} docsRoot
 */
function runGeneration(docsRoot) {
    const results = { success: [], failed: [] };
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
            console.error(`❌ [gosts] Ошибка для ${lang}:`, err);
            results.failed.push(lang);
        }
    }
    return results;
}
module.exports = { runGeneration };