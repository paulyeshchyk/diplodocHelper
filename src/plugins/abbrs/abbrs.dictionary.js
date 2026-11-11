const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getAbbrOutputDir } = require('./abbrs.paths');
const { Sanitizer } = require('../utils/sanitize');

const DICT_FILENAME = 'abbreviations.yaml';

/**
 * Путь к словарю сокращений: {langDir}/<subdir>/abbreviations.yaml
 * @param {string} langDir
 * @param {string} [lang]
 * @returns {string}
 */
function getAbbrDictionaryPath(langDir, lang) {
    return path.join(getAbbrOutputDir(langDir, lang), DICT_FILENAME);
}

/**
 * @param {string} langDir
 * @param {string} [lang]
 * @returns {Map<string, import('./abbrs.model').AbbrDefinition>}
 */
function loadAbbrDictionary(langDir, lang) {
    let dictPath;
    try {
        dictPath = getAbbrDictionaryPath(langDir, lang);
    } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return new Map();
    }
    if (!fs.existsSync(dictPath)) return new Map();

    try {
        const raw = fs.readFileSync(dictPath, 'utf8');
        const parsed = yaml.load(raw);

        if (parsed == null) return new Map();
        if (!Array.isArray(parsed)) {
            console.warn(`[abbrs] ${dictPath}: ожидался массив, получен ${typeof parsed}`);
            return new Map();
        }

        const map = new Map();
        for (const entry of parsed) {
            if (!entry || typeof entry !== 'object') continue;

            const abbr = Sanitizer.stripTags(String(entry.abbr || ''));
            if (!abbr) {
                console.warn(`[abbrs] ${dictPath}: пропущена запись с пустым abbr`, entry);
                continue;
            }
            const full = Sanitizer.sanitizeHtml(String(entry.full || '').trim());
            if (!full) {
                console.warn(`[abbrs] ${dictPath}: пропущена запись без full`, entry);
                continue;
            }

            map.set(abbr, {
                abbr,
                full,
                category: entry.category ? Sanitizer.stripTags(String(entry.category).trim()) : undefined,
                description: entry.description ? Sanitizer.sanitizeHtml(String(entry.description).trim()) : undefined,
            });
        }
        return map;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [abbrs] Ошибка загрузки ${dictPath}: ${msg}`);
        return new Map();
    }
}

module.exports = { loadAbbrDictionary, getAbbrDictionaryPath };
