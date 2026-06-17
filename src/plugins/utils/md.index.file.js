const fs = require('fs');
const path = require('path');
const { FrontMatterFiles } = require('../model/frontmatter.model');

// === Функции для Rename (обновление метаданных) ===

const { parse, stringify } = require('./frontmatter.utils');

/**
 * @param {string} folderPath
 * @returns {import("../model/section.model").SectionInfo?}
 */
function IndexMdFileRead(folderPath) {
    const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(indexPath)) return null;

    const content = fs.readFileSync(indexPath, 'utf8');
    const data = parse(content);
    return data.data;
}

/**
 * Обновляет index.md
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexMdFilePatch(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
    console.log(`IndexMdFilePatch:  ${folderPath}\\ ${sectionLabel}\\ ${pureTitle}`);
    const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
    if (!fs.existsSync(indexPath)) return;

    const content = fs.readFileSync(indexPath, 'utf8');
    let { data, content: body } = parse(content);

    const composedTitle = sectionIndex ? `${sectionLabel} ${sectionIndex}. ${pureTitle}` : pureTitle;

    data.title = composedTitle;
    data.pureTitle = pureTitle;
    data.sectionType = sectionTypeName;
    if (sectionIndex) {
        data.sectionIndex = sectionIndex;
    } else {
        delete data.sectionIndex;
    }

    fs.writeFileSync(indexPath, stringify(data, body), 'utf8');
}

module.exports = {
    IndexMdFileRead,
    IndexMdFilePatch,
};
