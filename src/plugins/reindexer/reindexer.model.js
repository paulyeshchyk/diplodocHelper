/**
 * @typedef {Object} ReindexWarning
 * @property {string} type - "missingSectionType" | "titleHasPrefix"
 * @property {string} message
 * @property {string} sectionPath
 */

/**
 * @typedef {Object} ReindexResult
 * @property {string} sectionPath
 * @property {string} currentIndex
 * @property {string} newFolderName
 * @property {number} localCounter
 * @property {ReindexWarning[]} warnings
 */

/** @typedef {Object} ReindexFiguresResult
 * @property {boolean} success
 * @property {number} total
 * @property {string | undefined} reason
 */
