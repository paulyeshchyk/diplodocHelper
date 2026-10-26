// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { walkMdFilesGetAbbrs } = require('./abbrs.collector');
const { writeAbbrsIndex } = require('./abbrs.writer');
const ABBR_CONFIG = require('./abbrs.config.js');
const { getAbbrOutputDir, getAbbrLanguages } = require('./abbrs.paths');

/**
 * @param {string} docsRoot
 */
function runGeneration(docsRoot) {
    const results = { success: [], failed: [] };

    for (const lang of getAbbrLanguages()) {
        const langDir = path.join(docsRoot, lang);
        if (!fs.existsSync(langDir)) continue;

        try {
            const abbrMap = walkMdFilesGetAbbrs(langDir);
            const all = Object.values(abbrMap);
            const definedCount = all.filter(a => a.definedInDictionary).length;
            const orphanCount = all.length - definedCount;
            const usedCount = all.filter(a => a.rank > 0).length;

            if (all.length === 0) {
                console.log(`[abbrs] ${lang}: ни словаря, ни разметки <abbr> — пропуск.`);
                continue;
            }

            const outputDir = getAbbrOutputDir(langDir, lang);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            writeAbbrsIndex(outputDir, abbrMap, lang, ABBR_CONFIG);
            console.log(
                `[abbrs] ${lang}: ${definedCount} в словаре, ` +
                    `${orphanCount} вне словаря, ${usedCount} используется → ${outputDir}`
            );
            results.success.push(lang);
        } catch (err) {
            console.error(`❌ [abbrs] Ошибка для ${lang}:`, err);
            results.failed.push(lang);
        }
    }

    return results;
}

module.exports = { runGeneration };
