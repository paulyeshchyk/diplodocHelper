// diplodocTypes.js

/**
 * @typedef {Object} SectionTypeOption
 * @property {string} label
 * @property {string} name
 * @property {string} value
 * @property {string} description
 */

/**
 * @typedef {Object} SectionInfo
 * @property {string | undefined} [title]
 * @property {string | undefined} [pureTitle]
 * @property {string | undefined} [sectionIndex]
 * @property {string | undefined} [sectionType]
 */


/**
 * @typedef {Object} PageInfo
 * @property {string} title
 * @property {string} href
 */

/**
 * @typedef {Object} ContextData
 * @property {number} rank
 * @property {PageInfo[]} pages
 */

/**
 * @typedef {Object.<string, ContextData>} ContextMap
 */
