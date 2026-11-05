const {
    String_Transliterate_Cyrillic,
} = require('./string/String_Transliterate_Cyrillic.ts');

/**
 * @deprecated Импортируйте `String_Transliterate_Cyrillic` напрямую.
 * Shim сохраняет имена `diplodocTransliterate` / `diplodocReverseTransliterate`
 * для обратной совместимости с `plugins/utils/index.js` (публичный экспорт)
 * и любыми внешними потребителями в `docs/`.
 *
 * Regression: 00.6.1#01..#17.
 */
const diplodocTransliterate = String_Transliterate_Cyrillic.toLatin;
const diplodocReverseTransliterate = String_Transliterate_Cyrillic.fromLatinLegacy;

module.exports = { diplodocTransliterate, diplodocReverseTransliterate };