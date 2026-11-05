const { Url_Transform_Segment } = require('./url/Url_Transform_Segment.ts');
const { diplodocTransliterate: transliterate } = require('./transliterate');
const { Url_Transform_Reference } = require('./url/Url_Transform_Reference.ts');

/**
 * Slug для имён файлов (сохраняет кириллицу, не транслитерирует).
 * Мигрирует в Track B, волна B-4.
 * @param {string} str
 */
function slugify_filename(str) {
    return str
        .replace(/[^\p{L}\p{N}\-._]/gu, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Транслит по сегментам URL-пути (B-5, помечен на dead-code check).
 * @param {string} urlPath
 */
function slugify_latin(urlPath) {
    if (!urlPath) return urlPath;
    return urlPath
        .split('/')
        .map(segment => transliterate(segment))
        .join('/');
}

/**
 * @deprecated Импортируйте `Url_Transform_Segment.slugify` напрямую.
 * Shim сохранён до конца Track B для минимального диффа в потребителях.
 *
 * Regression: 00.6.2#01..#18.
 */
const slugify_latin_alphanumeric = Url_Transform_Segment.slugify;

/**
 * @deprecated Импортируйте `Url_Transform_Reference.slugify` напрямую.
 * Shim сохранён до конца Track B для минимального диффа в потребителях.
 *
 * Regression: 00.6.3#17, #19.
 */
const slugify_diplodoc_reference = Url_Transform_Reference.slugify;

module.exports = {
    slugify_diplodoc_reference,
    slugify_filename,
    slugify_latin,
    slugify_latin_alphanumeric,
};