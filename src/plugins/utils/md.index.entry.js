// index.md.entry.js

const { IndexMdFileRead } = require('./md.index.file');

/**
 * Читает текущий sectionIndex
 * @param {string} folderPath
 * @returns {string}
 */
function IndexMdEntryReadIndex(folderPath) {
    const data = IndexMdFileRead(folderPath);
    if (!data) return '';
    return String(data.sectionIndex || '');
}

/**
 * Читает текущий pureTitle
 * @param {string} folderPath
 * @returns {string}
 */
function IndexMdEntryReadTitle(folderPath) {
    const data = IndexMdFileRead(folderPath);
    if (!data) return '';
    return String(data.pureTitle || data.title || '');
}

/**
 * @param {string} folderPath
 * @returns {string}
 */
function IndexMdEntryReadSectionType(folderPath) {
    const data = IndexMdFileRead(folderPath);
    if (!data) return '';
    return String(data.sectionType || '');
}

module.exports = {
    IndexMdEntryReadIndex,
    IndexMdEntryReadTitle,
    IndexMdEntryReadSectionType,
};
