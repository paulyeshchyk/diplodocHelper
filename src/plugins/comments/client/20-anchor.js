function buildAnchor(range) {
  const root = getRoot();
  const start = textOffset(root, range.startContainer, range.startOffset);
  const end = textOffset(root, range.endContainer, range.endOffset);
  if (start < 0 || end <= start) return null;
  const all = root.textContent;
  return {
    quote: all.slice(start, end),
    prefix: all.slice(Math.max(0, start - 50), start),
    suffix: all.slice(end, end + 50),
    startOffset: start, endOffset: end, xpath: null,
  };
}
function findAnchorPositions(root, anchor) {
  const text = root.textContent;
  if (anchor.startOffset != null && anchor.endOffset != null
    && text.slice(anchor.startOffset, anchor.endOffset) === anchor.quote) {
    return { start: anchor.startOffset, end: anchor.endOffset };
  }
  const combined = (anchor.prefix || '') + anchor.quote + (anchor.suffix || '');
  let idx = text.indexOf(combined);
  if (idx !== -1) {
    const start = idx + (anchor.prefix || '').length;
    return { start, end: start + anchor.quote.length };
  }
  idx = text.indexOf(anchor.quote);
  if (idx !== -1) return { start: idx, end: idx + anchor.quote.length };
  return null;
}