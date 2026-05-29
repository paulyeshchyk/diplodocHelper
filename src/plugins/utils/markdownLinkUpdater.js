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
 * Декодирует URL-encoded путь в строку файловой системы
 * @param {string} encodedPath
 * @returns {string}
 */
function decodeLinkPath(encodedPath) {
    try {
        return decodeURIComponent(encodedPath);
    } catch {
        return encodedPath;
    }
}

/**
 * Кодирует каждый сегмент пути, сохраняя слеши
 * @param {string} path - нормальный путь (с /)
 * @returns {string}
 */
function encodePathSegments(path) {
    return path
        .split('/')
        .map(seg => encodeURIComponent(seg))
        .join('/');
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

/**
 * Обновляет ссылки в одном .md файле
 * @param {string} content
 * @param {string} currentFilePath - абсолютный путь к файлу
 * @param {string} oldFolder - старый путь к разделу
 * @param {string} newFolder - новый путь
 * @returns {string}
 */
function updateLinksInContent(content, currentFilePath, oldFolder, newFolder) {
    const links = parseMarkdownLinks(content);
    if (links.length === 0) return content;

    let result = '';
    let lastIndex = 0;

    for (const link of links) {
        result += content.slice(lastIndex, link.index);

        // Пропускаем внешние ссылки
        if (link.rawPath.match(/^(https?:\/\/|#|mailto:|\/)/i)) {
            result += link.full;
            lastIndex = link.index + link.full.length;
            continue;
        }

        const { pathPart, query, hash } = splitPathQueryHash(link.rawPath);
        const decodedPath = decodeLinkPath(pathPart);
        const absoluteTarget = path.resolve(path.dirname(currentFilePath), decodedPath);

        if (isInsideRenamedFolder(absoluteTarget, oldFolder)) {
            const newAbsoluteTarget = getNewAbsoluteTarget(absoluteTarget, oldFolder, newFolder);
            let newRelativePath = path.relative(path.dirname(currentFilePath), newAbsoluteTarget);
            newRelativePath = newRelativePath.split(path.sep).join('/');
            const encodedRelativePath = encodePathSegments(newRelativePath);
            const newLink = buildMarkdownLink(link.isImage, link.text, encodedRelativePath, query, hash);
            result += newLink;
        } else {
            result += link.full;
        }

        lastIndex = link.index + link.full.length;
    }

    result += content.slice(lastIndex);
    return result;
}

module.exports = {
    parseMarkdownLinks,
    splitPathQueryHash,
    decodeLinkPath,
    encodePathSegments,
    isInsideRenamedFolder,
    getNewAbsoluteTarget,
    buildMarkdownLink,
    updateLinksInContent,
};
