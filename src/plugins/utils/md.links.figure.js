// utils/figure.js
const { slugify_latin_alphanumeric } = require('./encoding.slugify');

/**
 * Создаёт figure с стабильным id для ссылок
 * @param {string} url
 * @param {string} altText          - текст, который будет в подписи
 * @param {string?} [customId]       - если хочешь задать вручную (например "fig-search-modal")
 */
function buildFigure(url, altText, customId = null) {
    const linkBlock = `![${altText}](${url})`;

    const figureId = customId || buildFigureId(altText);

    const figureBlock = `<figure><figcaption class="imageDescription" id="${figureId}">${altText}</figcaption></figure>`;

    return `${linkBlock}\n\n${figureBlock}\n`;
}

/**
 * @param {string} altText
 */
function buildFigureId(altText) {
    return `fig-${slugify_latin_alphanumeric(altText)}`;
}

module.exports = { buildFigure, buildFigureId };
