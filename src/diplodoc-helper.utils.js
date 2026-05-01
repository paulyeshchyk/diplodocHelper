const fs = require('fs');
const path = require('path');

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * (содержит обязательную тройку файлов)
 * @param {string} folderPath 
 * @returns {boolean}
 */
function isDiplodocSection(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) return false;
    const requiredFiles = ['index.md', 'index.yaml', 'toc.yaml'];
    return requiredFiles.every(file => fs.existsSync(path.join(folderPath, file)));
}

/**
 * Проверяет, является ли папка корнем языка (например, docs/ru)
 * @param {string} folderPath 
 * @returns {boolean}
 */
function isLanguageRoot(folderPath) {
    // Корень языка обычно содержит папку или файл оглавления, 
    // но не обязательно является "разделом" в плане наличия index.yaml
    return fs.existsSync(path.join(folderPath, 'toc.yaml'));
}

module.exports = {
    isDiplodocSection,
    isLanguageRoot
};