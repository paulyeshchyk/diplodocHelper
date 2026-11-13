// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { walkMdFilesGetAbbrs } = require('./abbrs.collector');
const { writeAbbrsIndex } = require('./abbrs.writer');
const ABBR_CONFIG = require('./abbrs.config.js');
const { getAbbrOutputDir, getAbbrLanguages } = require('./abbrs.paths');
const { createLogger } = require('../utils/logger');

/**
 * @param {string} docsRoot
 */
function runGeneration(docsRoot) {
    const log = createLogger('abbrs');
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
                log.info(`${lang}: ни словаря, ни разметки <abbr> — пропуск.`);
                continue;
            }

            const outputDir = getAbbrOutputDir(langDir, lang);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            writeAbbrsIndex(outputDir, abbrMap, lang, ABBR_CONFIG);
            log.info(`${lang}: ${definedCount} в словаре, ${orphanCount} вне словаря, ${usedCount} используется → ${outputDir}`);
            results.success.push(lang);
        } catch (err) {
            log.error(`Ошибка для ${lang}:`, err);
            results.failed.push(lang);
        }
    }

    return results;
}

module.exports = { runGeneration };
