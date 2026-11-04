const { InlineAnnotation_Make_AnchorId } = require('../utils/inline-annotation/InlineAnnotation_Make_AnchorId.ts');
const { Html_Escape_Text } = require('../utils/html/Html_Escape_Text.ts');
const { Html_Escape_JsonString } = require('../utils/html/Html_Escape_JsonString.ts');

/**
 * @typedef {Object} AbbrPage
 * @property {string} title
 * @property {string} href
 * @property {number} occurrences
 */
/**
 * @typedef {Object} AbbrEntry
 * @property {string} abbr
 * @property {string} full
 * @property {string} [category]
 * @property {string} [description]
 * @property {boolean} definedInDictionary
 * @property {number} rank
 * @property {number} totalOccurrences
 * @property {AbbrPage[]} pages
 */

/**
 * @typedef {Record<string, AbbrEntry>} AbbrMap
 */
/**
 * @typedef {Object} AbbrDefinition
 * @property {string} abbr
 * @property {string} full
 * @property {string} [category]
 * @property {string} [description]
 */

// ---

/**
 * @param {string} abbr
 * @returns {string}
 */
function abbrAnchorId(abbr) {
    return InlineAnnotation_Make_AnchorId.makeAnchorId('abbr', abbr);
}

/**
 * @param {string} abbr
 * @param {number} n
 * @returns {string}
 */
function abbrOccurrenceId(abbr, n) {
    return InlineAnnotation_Make_AnchorId.makeOccurrenceId('abbr', abbr, n);
}

module.exports = {
    abbrAnchorId,
    abbrOccurrenceId,
    escapeHtml: Html_Escape_Text.escape,
    jsonEscapeHtmlForDiplodoc: Html_Escape_JsonString.escape,
};