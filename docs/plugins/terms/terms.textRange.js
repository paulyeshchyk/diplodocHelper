const { findAroundOffset } = require('./shared');

/**
 * Находит <abbr class="...term...">…</abbr> вокруг смещения.
 *
 * `term` — канонический термин для lookup (`data-term` или, если нет, inner).
 * `visibleText` — то, что видно в тексте.
 *
 * @param {string} text
 * @param {number} offset
 * @returns {{ startOffset: number, endOffset: number, term: string, visibleText: string, dataTerm: string } | null}
 */
function findTermAroundOffset(text, offset) {
  const found = findAroundOffset(text, offset, 'abbr');
  if (!found) return null;

  const startTagEnd = text.indexOf('>', found.startOffset);
  if (startTagEnd === -1) return null;
  const attrs = text.slice(found.startOffset, startTagEnd);
  if (!/\bclass\s*=\s*["'][^"']*\bterm\b/.test(attrs)) return null;

  const m = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const dataTerm = m ? ((m[1] !== undefined ? m[1] : m[2]) || '').trim() : '';
  const visibleText = found.inner;

  return {
    startOffset: found.startOffset,
    endOffset: found.endOffset,
    term: dataTerm || visibleText,
    visibleText,
    dataTerm,
  };
}

module.exports = { findTermAroundOffset };