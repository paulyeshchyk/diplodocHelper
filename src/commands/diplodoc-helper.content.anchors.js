// src/commands/diplodoc-helper.content.anchors.js
'use strict';

/**
 * Id, объявленные внутри переносимого фрагмента
 * (figcaption id, произвольные id= на тегах, {#slug} у заголовков).
 * @param {string} fragment
 * @returns {Set<string>}
 */
function collectMovedAnchorIds(fragment) {
  const ids = new Set();

  // id="..." / id='...'
  const attrRe = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(fragment)) !== null) {
    const id = m[1].trim();
    if (id) ids.add(id);
  }

  // Markdown heading anchors: ## Title {#my-id}
  const mdAnchorRe = /\{#([A-Za-z0-9_.:-]+)\}/g;
  while ((m = mdAnchorRe.exec(fragment)) !== null) {
    ids.add(m[1]);
  }

  return ids;
}

/**
 * Ссылка указывает на сам source-файл (тот, из которого вырезаем).
 * @param {string} absoluteLinkTarget
 * @param {string} sourceFilePath
 */
function isLinkToSourceDocument(absoluteLinkTarget, sourceFilePath) {
  const a = pathResolveNoThrow(absoluteLinkTarget);
  const b = pathResolveNoThrow(sourceFilePath);
  if (a && b && a === b) return true;

  // ./index.md из non-index файла → …/dir/index.md, source может быть …/dir/page.md
  // для diplodoc-якорей figure почти всегда source = index.md, этого достаточно
  return false;
}

/**
 * @param {string} p
 */
function pathResolveNoThrow(p) {
  try {
    return require('path').resolve(p);
  } catch {
    return null;
  }
}

module.exports = { collectMovedAnchorIds, isLinkToSourceDocument };