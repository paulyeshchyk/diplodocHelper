// Auto-generated runtime helper for NLS localization
const fs = require('fs');
const path = require('path');

/** * Кэш текущих переводов (плоский словарь)
 * @type {Record<string, string>}
 */
let currentTranslations = {};

/**
 * @param {string} locale
 * @param {string} rootPath
 */
function initNls(locale, rootPath) {
    const loadJson = (/** @type {string} */ name) => {
        const p = path.join(rootPath, name);
        if (!fs.existsSync(p)) return {};
        try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
        catch (e) {
            let msg = e instanceof Error ? e.message : String(e);
            console.error(`[nls] ${p}: ${msg}`);
            return {};
        }
    };

    // 1. База — английский (все ключи гарантированно)
    const base = loadJson('package.nls.json');
    // 2. Override — локаль (если файла нет — только база)
    const override = locale === 'en' ? {} : loadJson(`package.nls.${locale}.json`);
    // 3. Merge
    currentTranslations = { ...base, ...override };
}

/**
 * Функция перевода по ключу.
 * @param {string} key - Путь к ключу локализации.
 * @param {...(string | number | boolean)} args - Аргументы для шаблона {0}, {1}...
 * @returns {string}
 */
function translate(key, ...args) {
    /** @type {string} */
    let template = currentTranslations[key] || key;

    if (args.length > 0) {
        template = template.replace(/{(\d+)}/g, (match, number) => {
            const index = parseInt(number, 10);
            return typeof args[index] !== 'undefined' ? String(args[index]) : match;
        });
    }
    return template;
}

module.exports = { initNls, translate };
