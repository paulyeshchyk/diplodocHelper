// utils/figure.js
const { slugify_0x30_0x39_0x41_0x5A_legacy2 } = require('../utils/slugify');

/**
 * Создаёт figure с стабильным id для ссылок
 * @param {string} url
 * @param {string} altText          - текст, который будет в подписи
 * @param {string?} [customId]       - если хочешь задать вручную (например "fig-search-modal")
 */
function buildFigure(url, altText, customId = null) {
    const linkBlock = `![${altText}](${url})`;

    const figureId = customId || `fig-${slugify_0x30_0x39_0x41_0x5A_legacy2(altText)}`;

    const figureBlock = `<figure>
  <figcaption class="imageDescription" id="${figureId}">${altText}</figcaption>
</figure>`;

    return `${linkBlock}\n\n${figureBlock}\n`;
}

module.exports = { buildFigure };
