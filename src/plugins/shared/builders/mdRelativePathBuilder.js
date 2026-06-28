const path = require('path');

const INDEX_MD = 'index.md';

/**
 * Вычисляет относительный путь с кодированием
 * @param {string} fromPath – путь к исходному файлу (директория, относительно которой строим путь)
 * @param {string} toPath – целевой путь (файл или папка)
 * @param {boolean} addIndex – нужно ли добавить index.md (для ссылок на папки)
 * @returns {string}
 */
function buildMdRelativePath(fromPath, toPath, addIndex) {
    let targetFile = toPath;

    if (addIndex) {
        if (!targetFile.endsWith('.md')) {
            targetFile = path.join(targetFile, INDEX_MD);
        }
    }

    let relPath = path.relative(path.dirname(fromPath), targetFile);
    relPath = relPath.split(path.sep).join('/');

    const encodedPath = relPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return encodedPath.startsWith('.') ? encodedPath : './' + encodedPath;
}

module.exports = { buildMdRelativePath };
