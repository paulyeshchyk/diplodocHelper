const path = require('path');

const INDEX_MD = 'index.md';

/**
 * Возвращает путь к целевому MD-файлу для извлечения якорей (если применимо)
 * @param {string} targetFilePath – абсолютный путь к объекту (файл или папка)
 * @param {boolean} isDirectory – является ли объект папкой
 * @returns {string | null} – путь к .md файлу или null
 */
function getTargetMdFile(targetFilePath, isDirectory) {
    if (isDirectory) {
        return path.join(targetFilePath, INDEX_MD);
    }
    if (targetFilePath.endsWith('.md')) {
        return targetFilePath;
    }
    return null;
}

module.exports = { getTargetMdFile };
