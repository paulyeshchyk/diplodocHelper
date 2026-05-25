// index.md.entry.js

const { IndexMdFileRead } = require('./index.md.file');

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

module.exports = {
  IndexMdEntryReadIndex,
  IndexMdEntryReadTitle,
};
