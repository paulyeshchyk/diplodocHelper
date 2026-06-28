// src/utils/section.js
const { FrontMatterMeta } = require('../../../model/frontmatter.model');
const { frontmatterGet } = require('./frontmatter.facade');

/**
 * Извлекает метаданные раздела из содержимого index.md
 * @param {string} content
 * @returns {import('../../../model/section.model').SectionInfo}
 */
function getSectionMetadata(content) {
    return {
        sectionType: frontmatterGet(content, FrontMatterMeta.SECTIONTYPE),
        pureTitle: frontmatterGet(content, FrontMatterMeta.PURETITLE) || frontmatterGet(content, FrontMatterMeta.TITLE),
        sectionIndex: frontmatterGet(content, FrontMatterMeta.SECTIONINDEX),
    };
}

module.exports = {
    getSectionMetadata,
};
