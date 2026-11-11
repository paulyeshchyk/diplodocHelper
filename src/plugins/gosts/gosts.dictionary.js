// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// Предполагается, что вы создали gosts.paths.js по аналогии с terms.paths.js
const { getGostOutputDir } = require('./gosts.paths');
const { Sanitizer } = require('../utils/sanitize');

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

        const sanitized = result.map(entry => {
            if (!entry || typeof entry !== 'object') return entry;
            return {
                ...entry,
                code: Sanitizer.stripTags(entry.code),
                type: Sanitizer.stripTags(entry.type),
                date: Sanitizer.stripTags(entry.date),
                status: Sanitizer.stripTags(entry.status),
                title: Sanitizer.sanitizeHtml(entry.title),
                description: Sanitizer.sanitizeHtml(entry.description),
            };
        });

        console.log(`[gosts] Загружено ${sanitized.length} записей из ${dictPath}`);
        return sanitized;

    } catch (err) {
        console.error(`❌ [gosts] Ошибка парсинга ${dictPath}: ${err.message}`);
        return [];
    }
}

module.exports = { loadGostDictionary, getGostDictionaryPath };