const path = require('path');

/**
 * Находит все markdown-ссылки и изображения в строке
 * @param {string} text
 * @returns {Array<{full: string, isImage: boolean, text: string, rawPath: string, index: number}>}
 */
function parseMarkdownLinks(text) {
    const regex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        links.push({
            full: match[0],
            isImage: match[1] === '!',
            text: match[2],
            rawPath: match[3],
            index: match.index,
        });
    }
    return links;
}

/**
 * Разделяет путь ссылки на часть пути, query и якорь
 * @param {string} rawPath - например "path/to/file.md?param=1#heading"
 * @returns {{pathPart: string, query: string, hash: string}}
 */
function splitPathQueryHash(rawPath) {
    let pathPart = rawPath;
    let hash = '';
    let query = '';

    const hashIndex = rawPath.indexOf('#');
    if (hashIndex !== -1) {
        hash = rawPath.slice(hashIndex);
        pathPart = rawPath.slice(0, hashIndex);
    }

    const queryIndex = pathPart.indexOf('?');
    if (queryIndex !== -1) {
        query = pathPart.slice(queryIndex);
        pathPart = pathPart.slice(0, queryIndex);
    }

    return { pathPart, query, hash };
}

/**
 * Проверяет, лежит ли целевой путь внутри переименовываемой папки
 * @param {string} absoluteTarget - абсолютный путь к цели
 * @param {string} oldFolder - старый абсолютный путь к папке раздела
 * @returns {boolean}
 */
function isInsideRenamedFolder(absoluteTarget, oldFolder) {
    return absoluteTarget === oldFolder || absoluteTarget.startsWith(oldFolder + path.sep);
}

/**
 * Вычисляет новый абсолютный путь цели после переименования
 * @param {string} absoluteTarget - старый абсолютный путь
 * @param {string} oldFolder
 * @param {string} newFolder
 * @returns {string}
 */
function getNewAbsoluteTarget(absoluteTarget, oldFolder, newFolder) {
    if (absoluteTarget === oldFolder) {
        return newFolder;
    }
    const relativePart = absoluteTarget.slice(oldFolder.length + 1);
    return path.join(newFolder, relativePart);
}

/**
 * Создаёт новую markdown-ссылку
 * @param {boolean} isImage
 * @param {string} text
 * @param {string} newRelativePath - уже закодированный относительный путь
 * @param {string} query
 * @param {string} hash
 * @returns {string}
 */
function buildMarkdownLink(isImage, text, newRelativePath, query, hash) {
    const prefix = isImage ? '!' : '';
    const fullPath = newRelativePath + query + hash;
    return `${prefix}[${text}](${fullPath})`;
}

module.exports = {
    parseMarkdownLinks,
    splitPathQueryHash,
    isInsideRenamedFolder,
    getNewAbsoluteTarget,
    buildMarkdownLink,
};
