const { Url_Transform_Segment } = require('./url/Url_Transform_Segment.ts');
const { diplodocTransliterate: transliterate } = require('./transliterate');
const { Url_Transform_Filename } = require('./url/Url_Transform_Filename.ts');
const { Url_Transform_Reference } = require('./url/Url_Transform_Reference.ts');

/**
 * @deprecated Импортируйте `Url_Transform_Filename.slugify` напрямую.
 * Shim сохранён до конца Track B для минимального диффа в потребителях.
 *
 * Regression: 00.6.4#19, #20.
 */
const slugify_filename = Url_Transform_Filename.slugify;

/**
 * Транслит по сегментам URL-пути (кириллица → латиница, разделитель `/`).
 * 
 * ⚠️ **Не имеет потребителей в `src/`.** Legacy-функция, экспортируется
 * только через `utils/index.js` для обратной совместимости с внешними
 * проектами (в частности, со скриптами, установленными через
 * `installScripts` в целевом проекте).
 * 
 * Контракт:
 *   - falsy вход (`''`, `null`, `undefined`, `0`) возвращается как есть;
 *   - `.split('/')` — транслит каждого сегмента отдельно;
 *   - `.join('/')` — восстановление пути; пустые сегменты (от `//`)
 *     сохраняются как пустые;
 *   - нормализации нет: пробелы, точки, `@` сохраняются; нижний регистр
 *     применяется через `transliterate` (там `toLowerCase`);
 *   - спецсимволы `|&%$<>` транслируются в слова (см. `transliterate`).
 * 
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