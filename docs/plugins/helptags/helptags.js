// @ts-nocheck
// plugins/helptags/helptags.js

const path = require('path');
const fs = require('fs');

const { walkMdFilesGetHelptags } = require('./helptags.collector');
const { writeHelptagsIndex } = require('./helptags.writer');

/** @import {PluginExecutionResult} from '../model/plugin.model' */

/**
 * @param {string} lang
 * @param {string} langDir
 * @param {Object} helptagMap
 * @returns {boolean}
 */
function generateFilesForLang(lang, langDir, helptagMap) {
    try {
        if (Object.keys(helptagMap).length === 0) return false;

        const outputDir = path.join(langDir, 'helptags');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // Сортируем helptags по алфавиту
        const sortedTags = Object.keys(helptagMap).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        const title = lang === 'ru' ? 'Справочные теги' : 'Help Tags';

        // Генерируем единственную страницу index.md и конфигурацию toc.yaml / index.yaml
        writeHelptagsIndex(outputDir, sortedTags, helptagMap, lang, title);

        return true;
    } catch (err) {
        console.error(`❌ Error generating helptags for ${lang}:`, err);
        return false;
    }
}

/**
 * @param {string} docsRoot
 * @returns {PluginExecutionResult}
 */
function runGeneration(docsRoot) {
    const LANGUAGES = ['ru', 'en'];
    /** @type {PluginExecutionResult} */
    const results = { success: [], failed: [] };

    for (const lang of LANGUAGES) {
        const langDir = path.join(docsRoot, lang);
        if (fs.existsSync(langDir)) {
            const helptagMap = walkMdFilesGetHelptags(langDir);
            if (generateFilesForLang(lang, langDir, helptagMap)) {
                results.success.push(lang);
            } else {
                results.failed.push(lang);
            }
        }
    }
    return results;
}

module.exports = { runGeneration };
