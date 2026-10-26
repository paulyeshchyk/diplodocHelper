const { makeAnchorId, makeOccurrenceId, escapeHtml, jsonEscapeHtmlForDiplodoc } = require('./shared');


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
    return makeAnchorId('abbr', abbr);
}

/**
 * @param {string} abbr
 * @param {number} n
 * @returns {string}
 */
function abbrOccurrenceId(abbr, n) {
    return makeOccurrenceId('abbr', abbr, n);
}

module.exports = {
    abbrAnchorId,
    abbrOccurrenceId,
    escapeHtml,
    jsonEscapeHtmlForDiplodoc,
};