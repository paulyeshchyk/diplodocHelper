// utils/slugify.js

const { transliterate } = require('transliteration');

/**
 * Оставляет только безопасные символы
 * заменяет пробелы на дефисы, оставляя один дефис
 * убирая дефисы в начале/конце
 * @param {string} text
 */
function slugify_0x30_0x39_0x41_0x5A(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-яё0-9\s\-_]/g, '')
        .replace(/[\s\-_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * @param {string} text
 */
function slugify_0x30_0x39_0x41_0x5A_legacy(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-яё0-9\s\-_]/g, '')
        .replace(/[\s\-_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * @param {string} str
 */
function slugify_0x30_0x39_0x41_0x5A_legacy2(str) {
    return str
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

/**
 * Приводит строку к slug-формату (для URL, имён файлов)
 * @param {string} str
 */
function slugify_url(str) {
    return str
        .replace(/[^\p{L}\p{N}\-._]/gu, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * @param {string} urlPath
 */
function encodeUrlPath(urlPath) {
    if (!urlPath) return urlPath;

    return urlPath
        .split('/')
        .map(segment => transliterate(segment))
        .join('/');
}

module.exports = {
    encodeUrlPath,
    slugify_url,
    slugify_0x30_0x39_0x41_0x5A,
    slugify_0x30_0x39_0x41_0x5A_legacy,
    slugify_0x30_0x39_0x41_0x5A_legacy2,
};
