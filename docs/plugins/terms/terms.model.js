const { makeAnchorId, makeOccurrenceId, escapeHtml, jsonEscapeHtmlForDiplodoc } = require('./shared');

/**
 * @param {string} term
 * @returns {string}
 */
function termAnchorId(term) {
  return makeAnchorId('term', term);
}

/**
 * @param {string} term
 * @param {number} n
 * @returns {string}
 */
function termOccurrenceId(term, n) {
  return makeOccurrenceId('term', term, n);
}

module.exports = {
  termAnchorId,
  termOccurrenceId,
  escapeHtml,
  jsonEscapeHtmlForDiplodoc,
};