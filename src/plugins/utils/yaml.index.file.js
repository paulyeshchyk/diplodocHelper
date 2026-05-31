// index.yaml.file.js

const fs = require('fs');
const path = require('path');
const { FrontMatterFiles } = require('../model/frontmatter.model');
const { TEMPLATE_INDEX_YAML } = require('../model/frontmatter.templates');

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexYamlFileCreate(folderPath, title, sectionType, sectionLabel, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
    fs.writeFileSync(filePath, TEMPLATE_INDEX_YAML(title, sectionType, sectionLabel, sectionIndex), 'utf8');
}

module.exports = {
    IndexYamlFileCreate,
};
