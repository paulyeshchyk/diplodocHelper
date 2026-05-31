const path = require('node:path');

/**
 * Проверяет, является ли файл HTML
 * @param {string} filePath
 */
function isHtmlFile(filePath) {
    return filePath.toLowerCase().endsWith('.html');
}

/**
 * Проверяет, является ли путь корневым index.html
 * @param {string} buildDir
 * @param {string} htmlPath
 */
function isRootIndex(buildDir, htmlPath) {
    const fileName = path.basename(htmlPath);
    return fileName === 'index.html' && path.dirname(htmlPath) === buildDir;
}

module.exports = {
    isHtmlFile,
    isRootIndex,
};
