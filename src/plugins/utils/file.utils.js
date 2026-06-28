// src/commands/diplodoc-helper.link.Paste.Utils.File.js

const fs = require('fs').promises;
const path = require('path');

/**
 * Определяет тип целевого объекта (папка, изображение, обычный файл)
 * @param {string} targetFilePath – абсолютный путь
 * @returns {Promise<{isDirectory: boolean, isImage: boolean}>}
 */
async function getFileTypeInfo(targetFilePath) {
    let isDirectory = false;
    let isImage = false;

    const ext = path.extname(targetFilePath);

    try {
        const stat = await fs.stat(targetFilePath);
        isDirectory = stat.isDirectory();
        if (!isDirectory) {
            isImage = ext !== 'md';
        }
    } catch {
        if (!ext) {
            isDirectory = true; // нет расширения — считаем папкой
        }
    }
    return { isDirectory, isImage };
}

module.exports = { getFileTypeInfo };
