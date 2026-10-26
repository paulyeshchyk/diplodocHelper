// utils/slugify.js

const { diplodocTransliterate: transliterate } = require('./transliterate');

/**
 * Заменяет все символы, не являющиеся буквами (любого алфавита), цифрами, дефисом, точкой или подчёркиванием, на подчёркивание.
 * Множественные подчёркивания схлопываются в одно, подчёркивания в начале/конце удаляются.
 * Кириллица и другие Unicode-буквы сохраняются, транслитерация НЕ выполняется.
 * Результат безопасен для использования в именах файлов в большинстве ОС.
 *
 * @param {string} str - Входная строка (может содержать любые символы)
 * @returns {string} Очищенная строка, пригодная для имени файла (с буквами, цифрами, дефисами, точками, подчёркиваниями)
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

/**
 * Создает готовую строку ссылки для md-документа.
 * Очищает заголовок, транслитерирует и склеивает с путем к файлу.
 *
 * @param {string} text - Входной текст параграфа (например, "# Действующие лица...")
 * @returns {string} Готовая ссылка вида "./index.md#dejstvuyushie-..."
 */
function slugify_diplodoc_reference(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Удаляем маркеры заголовков Markdown (#) и пробелы в самом начале
    let cleanText = text.replace(/^#+\s*/, '');

    // 2. Прогоняем через транслитератор (& -> and, % -> percent и т.д.)
    let slug = transliterate(cleanText);

    // 3. Приводим к нижнему регистру
    slug = slug.toLowerCase();

    // 4. Заменяем пробелы на дефисы
    slug = slug.replace(/\s+/g, '-');

    // 5. Очищаем шум.
    slug = slug.replace(/[^a-z0-9\/=\\ -]/g, '');

    // 6. Схлопываем множественные дефисы в один
    slug = slug.replace(/-+/g, '-');

    return slug;
}
module.exports = {
    slugify_diplodoc_reference,
    slugify_filename,
    slugify_latin,
    slugify_latin_alphanumeric,
};
