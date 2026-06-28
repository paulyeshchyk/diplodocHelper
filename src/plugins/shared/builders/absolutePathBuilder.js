const path = require('path');

const INDEX_MD = 'index.md';
const INDEX_HTML = 'index.html';

/**
 * Строит абсолютный URL-путь от корня проекта (начинается с /)
 * @param {string} projectRoot
 * @param {string} targetFilePath
 * @param {boolean} addIndex
 * @param {boolean} useHtmlExtension – если true, использует .html вместо .md
 * @returns {string}
 */
function buildAbsolutePath(projectRoot, targetFilePath, addIndex, useHtmlExtension) {
    let targetFile = targetFilePath;
    if (addIndex) {
        // Папка: используем index.html или index.md
        targetFile = path.join(targetFile, useHtmlExtension ? INDEX_HTML : INDEX_MD);
    } else {
        // Если файл .md и нужен HTML, заменяем расширение
        if (useHtmlExtension && targetFile.endsWith('.md')) {
            targetFile = targetFile.slice(0, -3) + '.html';
        }
    }
    const relPath = path.relative(projectRoot, targetFile);
    const encoded = relPath.split(path.sep).map(encodeURIComponent).join('/');
    return '/' + encoded;
}

module.exports = { buildAbsolutePath };
