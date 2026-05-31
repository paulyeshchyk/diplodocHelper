// src/utils/section.js
const { FrontMatterMeta } = require('../model/frontmatter.model');
const { get } = require('./frontmatter.utils');

/** @import {SectionInfo} from  '../model/section.model'*/

/**
 * Извлекает метаданные раздела из содержимого index.md
 * @param {string} content
 * @returns {SectionInfo}
 */
function getSectionMetadata(content) {
    return {
        sectionType: get(content, FrontMatterMeta.SECTIONTYPE),
        pureTitle: get(content, FrontMatterMeta.PURETITLE) || get(content, FrontMatterMeta.TITLE),
        sectionIndex: get(content, FrontMatterMeta.SECTIONINDEX),
    };
}

module.exports = {
    getSectionMetadata,
};
