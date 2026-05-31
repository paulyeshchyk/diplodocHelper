const fs = require('fs');
const path = require('path');
const { FrontMatterFiles } = require('../model/frontmatter.model');

/**
 * @param {string} parentDir
 * @param {any} oldFolderName
 * @param {any} newFolderName
 * @param {any} composedTitle
 */
function IndexYamlEntryPatchHRef(parentDir, oldFolderName, newFolderName, composedTitle) {
    const indexPath = path.join(parentDir, FrontMatterFiles.INDEX_YAML);
    if (!fs.existsSync(indexPath)) return;

    let content = fs.readFileSync(indexPath, 'utf8');

    content = content.replace(new RegExp(`(href:\\s*)${oldFolderName}/`, 'g'), `$1${newFolderName}/`);

    const selfRegex = new RegExp(`(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldFolderName}/index\\.md`, 'g');
    content = content.replace(selfRegex, `$1${composedTitle}$3${newFolderName}/index.md`);

    fs.writeFileSync(indexPath, content, 'utf8');
}
/**
 * Обновляет index.yaml
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexYamlEntryPatchSection(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex = '') {
    const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
    if (!fs.existsSync(yamlPath)) return;

    let content = fs.readFileSync(yamlPath, 'utf8');

    const composedTitle =
        sectionIndex && sectionIndex.trim() !== '' ? `${sectionLabel} ${sectionIndex}. ${pureTitle}` : pureTitle;

    // Простая замена по ключам
    content = content.replace(/^title:.*/m, `title: ${composedTitle}`);

    content = content.replace(/^pureTitle:.*/m, `pureTitle: ${pureTitle}`);

    content = content.replace(/^sectionType:.*/m, `sectionType: ${sectionTypeName}`);

    if (sectionIndex && sectionIndex.trim() !== '') {
        content = content.replace(/^sectionIndex:.*/m, `sectionIndex: ${sectionIndex}`);
    } else {
        content = content.replace(/^sectionIndex:.*\r?\n?/m, '');
    }

    fs.writeFileSync(yamlPath, content, 'utf8');
}

module.exports = { IndexYamlEntryPatchHRef, IndexYamlEntryPatchSection };
