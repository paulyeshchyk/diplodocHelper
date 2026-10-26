// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// Предполагается, что вы создали gosts.paths.js по аналогии с terms.paths.js
const { getGostOutputDir } = require('./gosts.paths');

const DICT_FILENAME = 'gosts.yaml';

/**
 * @param {string} langDir
 * @param {string} lang
 */
function getGostDictionaryPath(langDir, lang) {
    return path.join(getGostOutputDir(langDir, lang), DICT_FILENAME);
}

/**
 * @param {string} langDir
 * @param {string} lang
 */
function loadGostDictionary(langDir, lang) {
    let dictPath;
    try {
        dictPath = getGostDictionaryPath(langDir, lang);
    } catch (err) {
        console.error(`❌ [gosts] Ошибка определения пути: ${err.message}`);
        return []; 
    }

    if (!fs.existsSync(dictPath)) {
        console.warn(`⚠️ [gosts] Файл словаря не найден по пути: ${dictPath}`);
        return [];
    }

    try {
        const raw = fs.readFileSync(dictPath, 'utf8');
        const parsed = yaml.load(raw);
        const result = Array.isArray(parsed) ? parsed : [];
        console.log(`[gosts] Загружено ${result.length} записей из ${dictPath}`);
        return result;
    } catch (err) {
        console.error(`❌ [gosts] Ошибка парсинга ${dictPath}: ${err.message}`);
        return [];
    }
}

module.exports = { loadGostDictionary, getGostDictionaryPath };