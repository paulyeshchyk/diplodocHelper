function findArticleBody() {
  return document.querySelector('.dc-doc-page__body')
    || document.querySelector('.dc-doc-page__content')
    || document.querySelector('.dc-doc-page__main');
}
function getRoot() {
  return findArticleBody() || document.querySelector('main') || document.body;
}
function textOffset(root, node, offset) {
  if (!root || !node) return -1;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let total = 0, cur;
  while ((cur = w.nextNode())) {
    if (cur === node) return total + offset;
    total += cur.textContent.length;
  }
  return -1;
}
function nodeAtOffset(root, offset) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let total = 0, cur;
  while ((cur = w.nextNode())) {
    const len = cur.textContent.length;
    if (total + len > offset) return { node: cur, offset: offset - total };
    total += len;
  }
  return null;
}
function rangeFromOffsets(root, start, end) {
  const a = nodeAtOffset(root, start);
  const b = nodeAtOffset(root, end);
  if (!a || !b) return null;
  const r = document.createRange();
  try { r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset); } catch { return null; }
  return r;
}
function offsetFromPoint(x, y) {
  let r = null;
  if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { r = document.createRange(); try { r.setStart(p.offsetNode, p.offset); r.collapse(true); } catch { return null; } }
  }
  if (!r) return null;
  const root = getRoot();
  if (!root.contains(r.startContainer)) return null;
  const o = textOffset(root, r.startContainer, r.startOffset);
  return o >= 0 ? o : null;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}