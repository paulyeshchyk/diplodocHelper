const path = require('node:path');

/** @import {ImageItem} from '../model/imageitem.model' */

/**
 * Декодирует URL-encoded путь
 * @param {string} rawPath
 */
function decodeImagePath(rawPath) {
    try {
        return decodeURIComponent(rawPath.split('#')[0]);
    } catch {
        return rawPath;
    }
}

/**
 * Вычисляет относительный путь
 * @param {string} currentFilePath
 * @param {ImageItem} image
 */
function getRelativeLink(currentFilePath, image) {
    const target = image.type === 'figure' ? `${image.filePath}#${image.id}` : image.targetPath;

    let relative = path.relative(path.dirname(currentFilePath), target).replace(/\\/g, '/');

    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }

    return relative;
}

/**
 * Нормализация пути для дедупликации (регистронезависимо)
 * @param {string} filePath
 */
function normalizePathForKey(filePath) {
    return filePath.toLowerCase().replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Получает относительный путь от базовой директории
 * @param {string} baseDir
 * @param {string} fullPath
 */
function getRelativePath(baseDir, fullPath) {
    return path.relative(baseDir, fullPath).replace(/\\/g, '/');
}

module.exports = { decodeImagePath, normalizePathForKey, getRelativeLink, getRelativePath };
