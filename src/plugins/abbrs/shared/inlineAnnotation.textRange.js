// @ts-nocheck
/**
 * Находит inline-аннотацию (<tagName>...</tagName>) вокруг смещения.
 * @param {string} text
 * @param {number} offset
 * @param {string} tagName — 'abbr' | 'term' | ...
 * @returns {{ startOffset: number, endOffset: number, inner: string } | null}
 */
function findAroundOffset(text, offset, tagName) {
  if (offset < 0 || offset > text.length) return null;
  if (!tagName) return null;

  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  const closeRe = new RegExp(`</${tagName}>`, 'i');

  const lastOpen = text.lastIndexOf(openTag, offset);
  if (lastOpen === -1) return null;

  const between = text.substring(lastOpen, offset);
  if (closeRe.test(between)) return null;

  const after = text.substring(offset);
  const closeMatch = after.match(closeRe);
  if (!closeMatch) return null;

  const openEnd = text.indexOf('>', lastOpen);
  if (openEnd === -1 || openEnd >= offset) return null;

  const innerStart = openEnd + 1;
  const innerEnd = offset + closeMatch.index;
  const inner = text.substring(innerStart, innerEnd).trim();
  if (!inner) return null;

  const endOffset = innerEnd + closeTag.length;
  return { startOffset: lastOpen, endOffset, inner };
}

module.exports = { findAroundOffset };