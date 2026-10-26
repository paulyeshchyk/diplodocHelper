const { findAroundOffset } = require('./shared');

/**
 * @param {string} text
 * @param {number} offset
 * @returns {{ startOffset: number, endOffset: number, abbr: string, visibleText: string, dataAbbr: string } | null}
 */
function findAbbrAroundOffset(text, offset) {
    const found = findAroundOffset(text, offset, 'abbr');
    if (!found) return null;

    const startTagEnd = text.indexOf('>', found.startOffset);
    if (startTagEnd === -1) return null;
    const attrs = text.slice(found.startOffset, startTagEnd);
    if (/\bclass\s*=/.test(attrs)) return null;

    const m = attrs.match(/\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const dataAbbr = m ? ((m[1] !== undefined ? m[1] : m[2]) || '').trim() : '';
    const visibleText = found.inner;

    return {
        startOffset: found.startOffset,
        endOffset: found.endOffset,
        abbr: dataAbbr || visibleText,
        visibleText,
        dataAbbr,
    };
}

module.exports = { findAbbrAroundOffset };
