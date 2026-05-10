//diplodoc-helper.utils.js

const fs = require('fs');
const path = require('path');
const { FrontMatterFiles, FrontMatterFilesDefaultList } = require("./diplodoc-helper.constants");

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * (содержит обязательную тройку файлов)
 * @param {string} folderPath 
 * @returns {boolean}
 */
function isDiplodocSection(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) return false;
    return FrontMatterFilesDefaultList.every(file => fs.existsSync(path.join(folderPath, file)));
}

/**
 * Проверяет, является ли папка корнем языка (например, docs/ru)
 * @param {string} folderPath 
 * @returns {boolean}
 */
function isLanguageRoot(folderPath) {
    // Корень языка обычно содержит папку или файл оглавления, 
    // но не обязательно является "разделом" в плане наличия index.yaml
    return fs.existsSync(path.join(folderPath, FrontMatterFiles.TOC_YAML));
}

module.exports = {
    isDiplodocSection,
    isLanguageRoot
};