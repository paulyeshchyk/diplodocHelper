// utils/figure.js

const path = require('path');
const { slugify_latin_alphanumeric } = require('./encoding.slugify');

/**
 * Создаёт figure с стабильным id для ссылок
 * @param {string} url
 * @param {string} altText          - текст, который будет в подписи
 * @param {string?} [customId]       - если хочешь задать вручную (например "fig-search-modal")
 * @returns {string}
 */
function buildFigure(url, altText, customId = null) {
    const linkBlock = `![${altText}](${url})`;

    const figureId = customId || buildFigureId(altText);

    const figureBlock = `<figure>\n\n${linkBlock}\n\n<figcaption class="imageDescription" id="${figureId}">${altText}</figcaption>\n\n</figure>\n\n`;

    return `${figureBlock}`;
}

/**
 * @param {string} altText
 */
function buildFigureId(altText) {
    return `fig-${slugify_latin_alphanumeric(altText)}`;
}

/**
 * @param {string} sourceLinkName
 * @param {string} mdPath
 */
function buildImageLink(sourceLinkName, mdPath) {
    const altText = path.basename(sourceLinkName, path.extname(sourceLinkName));

    const suggestedId = buildFigureId(altText);

    return buildFigure(mdPath, altText, suggestedId);
}

module.exports = { buildFigure, buildFigureId, buildImageLink };
