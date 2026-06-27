// src/utils/section.js
const { frontmatterGet } = require('./frontmatter.facade');
const { FrontMatterMeta } = require('../../../plugins/model/frontmatter.model');

/** @import {SectionInfo} from  '../../../plugins/model/section.model'*/

/**
 * Извлекает метаданные раздела из содержимого index.md
 * @param {string} content
 * @returns {SectionInfo}
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
