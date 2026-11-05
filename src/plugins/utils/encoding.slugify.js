const { Url_Transform_Segment } = require('./url/Url_Transform_Segment.ts');
const { diplodocTransliterate: transliterate } = require('./transliterate');

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
 * Slug для anchor'ов в md-ссылках (разделитель `-`, другие правила).
 * Мигрирует в Track B, волна B-3.
 * @param {string} text
 */
function slugify_diplodoc_reference(text) {
    if (!text || typeof text !== 'string') return '';
    let cleanText = text.replace(/^#+\s*/, '');
    let slug = transliterate(cleanText);
    slug = slug.toLowerCase();
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/[^a-z0-9\/=\\ -]/g, '');
    slug = slug.replace(/-+/g, '-');
    return slug;
}

module.exports = {
    slugify_diplodoc_reference,
    slugify_filename,
    slugify_latin,
    slugify_latin_alphanumeric,
};