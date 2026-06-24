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
    let nlsPath = path.join(rootPath, `package.nls.${locale}.json`);

    if (!fs.existsSync(nlsPath)) {
        nlsPath = path.join(rootPath, 'package.nls.json');
    }

    try {
        if (fs.existsSync(nlsPath)) {
            currentTranslations = JSON.parse(fs.readFileSync(nlsPath, 'utf8'));
        }
    } catch (err) {
        console.error('Failed to load NLS file:', err);
    }
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
