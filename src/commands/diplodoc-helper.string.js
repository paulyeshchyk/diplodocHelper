const { String_Slice_Middle } = require('../plugins/utils/string/String_Slice_Middle.ts');

/**
 * @deprecated Импортируйте `String_Slice_Middle` напрямую.
 * Shim оставлен для backward-compat с `test/commands/diplodoc-helper.string.test.js`.
 * @param {string} str
 */
function truncateMiddle(str, maxLength = 52, separator = '...') {
    return String_Slice_Middle.truncate(str, maxLength, separator);
}

 exports.truncateMiddle = truncateMiddle;
