const { buildImageLink } = require('./md.links.figure');

/**
 * Строит Markdown или HTML ссылку на документ в зависимости от контекста
 * @param {string} prefix – префикс (! для изображений, иначе пусто)
 * @param {string} sourceLinkName – текст ссылки
 * @param {string} documentRelativePath – путь к целевому файлу
 * @param {boolean} asHtml – флаг, принуждающий строить HTML-ссылку
 * @returns {string}
 */
function buildMixedLink(prefix, sourceLinkName, documentRelativePath, asHtml = false) {
    if (asHtml) {
        // Если это изображение внутри HTML тега, возвращаем тег <img>, иначе тег <a>
        return prefix === '!'
            ? `<img src="${documentRelativePath}" alt="${sourceLinkName}">`
            : `<a href="${documentRelativePath}">${sourceLinkName}</a>`;
    }
    return `${prefix}[${sourceLinkName}](${documentRelativePath})`;
}

/**
 * @param {boolean} isImage
 * @param {boolean} shouldRenderAsHtml
 * @param {ClipboardLink} externalLink
 * @param {string} documentRelativePath
 * @param {string} prefix
 */
function buildLink(isImage, shouldRenderAsHtml, externalLink, documentRelativePath, prefix) {
    if (isImage) {
        return shouldRenderAsHtml
            ? buildMixedLink('!', externalLink.sourceLinkName, documentRelativePath, true)
            : buildImageLink(externalLink.sourceLinkName, documentRelativePath);
    } else {
        return buildMixedLink(prefix, externalLink.sourceLinkName, documentRelativePath, shouldRenderAsHtml);
    }
}

module.exports = { buildLink };
