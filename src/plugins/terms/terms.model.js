const { InlineAnnotation_Make_AnchorId } = require('../utils/inline-annotation/InlineAnnotation_Make_AnchorId.ts');
const { Html_Escape_Text } = require('../utils/html/Html_Escape_Text.ts');
const { Html_Escape_JsonString } = require('../utils/html/Html_Escape_JsonString.ts');

/**
 * @param {string} term
 * @returns {string}
 */
function termAnchorId(term) {
  return InlineAnnotation_Make_AnchorId.makeAnchorId('term', term);
}

/**
 * @param {string} term
 * @param {number} n
 * @returns {string}
 */
function termOccurrenceId(term, n) {
  return InlineAnnotation_Make_AnchorId.makeOccurrenceId('term', term, n);
}

module.exports = {
  termAnchorId,
  termOccurrenceId,
  escapeHtml: Html_Escape_Text.escape,
  jsonEscapeHtmlForDiplodoc: Html_Escape_JsonString.escape,
};