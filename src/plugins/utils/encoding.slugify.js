// utils/slugify.js

const { transliterate } = require('transliteration');

/**
 * Заменяет все символы, не являющиеся буквами (любого алфавита), цифрами, дефисом, точкой или подчёркиванием, на подчёркивание.
 * Множественные подчёркивания схлопываются в одно, подчёркивания в начале/конце удаляются.
 * Кириллица и другие Unicode-буквы сохраняются, транслитерация НЕ выполняется.
 * Результат безопасен для использования в именах файлов в большинстве ОС.
 *
 * @param {string} str - Входная строка (может содержать любые символы)
 * @returns {string} Очищенная строка, пригодная для имени файла (с буквами, цифрами, дефисами, точками, подчёркиваниями)
 * @example
 * slugify_filename('Привет Мир!') // => "Привет_Мир_"
 * slugify_filename('my-file_v2.0 (test)') // => "my-file_v2.0_test_"
 * slugify_filename('...file...') // => "file"
 * slugify_filename('файл №1') // => "файл_1"
 */
function slugify_filename(str) {
    return str
        .replace(/[^\p{L}\p{N}\-._]/gu, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
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
 * Транслитерирует строку в латиницу и заменяет все НЕ буквенно-цифровые символы на подчёркивания.
 * Результат содержит только латинские буквы (a-z), цифры (0-9) и подчёркивания.
 * Множественные подчёркивания схлопываются в одно, подчёркивания в начале/конце удаляются.
 *
 * @param {string} text - Входная строка (может содержать кириллицу, пробелы, знаки препинания и т.д.)
 * @returns {string} Очищенный slug, содержащий только латиницу, цифры и подчёркивания.
 * @example
 * slugify_latin_alphanumeric('Привет Мир!') // => "privet_mir"
 * slugify_latin_alphanumeric('Файл №1 (важный)') // => "fail_1_vazhnyy"
 */
function slugify_latin_alphanumeric(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Транслитерация (кириллица -> латиница)
    let slug = transliterate(text);

    // 2. Приводим к нижнему регистру (опционально, обычно в slug используют нижний регистр)
    slug = slug.toLowerCase();

    // 3. Заменяем всё, что не латиница и не цифра, на подчёркивание
    slug = slug.replace(/[^a-z0-9]+/g, '_');

    // 4. Убираем множественные подчёркивания
    slug = slug.replace(/_+/g, '_');

    // 5. Обрезаем подчёркивания в начале и конце
    slug = slug.replace(/^_+|_+$/g, '');

    return slug;
}

module.exports = {
    slugify_filename,
    slugify_latin,
    slugify_latin_alphanumeric,
};
