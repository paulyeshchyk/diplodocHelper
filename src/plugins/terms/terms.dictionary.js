const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getTermOutputDir } = require('./terms.paths');

const DICT_FILENAME = 'terms.yaml';

/**
 * @param {string} langDir
 * @param {string} lang
 */
function getTermDictionaryPath(langDir, lang) {
    return path.join(getTermOutputDir(langDir, lang), DICT_FILENAME);
}

/**
 * @param {string} langDir
 * @param {string} lang
 */
function loadTermDictionary(langDir, lang) {
    let dictPath;
    try {
        dictPath = getTermDictionaryPath(langDir, lang);
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
            console.warn(`[terms] ${dictPath}: ожидался массив, получен ${typeof parsed}`);
            return new Map();
        }

        const map = new Map();
        for (const entry of parsed) {
            if (!entry || typeof entry !== 'object') continue;
            if (!entry.term || !entry.definition) {
                console.warn(`[terms] ${dictPath}: пропущена запись без term или definition`, entry);
                continue;
            }
            const term = String(entry.term).trim();
            map.set(term, {
                term,
                definition: String(entry.definition).trim(),
                category: entry.category ? String(entry.category).trim() : undefined,
                description: entry.description ? String(entry.description).trim() : undefined,
            });
        }
        return map;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [terms] Ошибка загрузки ${dictPath}: ${msg}`);
        return new Map();
    }
}

module.exports = { loadTermDictionary, getTermDictionaryPath };
