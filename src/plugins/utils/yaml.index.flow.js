const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const yaml = require('js-yaml');

const { FrontMatterFiles } = require('../model/frontmatter.model');
const frontmatterBuilder = require('../model/frontmatter.builder');

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
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexYamlFileCreate(folderPath, title, sectionType, sectionLabel, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
    const obj = frontmatterBuilder.GET_INDEX_YAML_OBJECT(title, sectionType, sectionLabel, sectionIndex);

    // Переводим объект в YAML-строку
    fs.writeFileSync(filePath, YAML.stringify(obj), 'utf8');
}

/**
 * Загружает toc.yaml и возвращает объект
 * @param {string} tocPath
 * @returns {IndexYaml}
 */
function loadIndexYaml(tocPath) {
    const content = fs.readFileSync(tocPath, 'utf8');
    return /** @type {IndexYaml} */ (yaml.load(content));
}

/**
 * Обновляет index.yaml (переписывает title, pureTitle, sectionType и sectionIndex)
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName  – например, "Chapter"
 * @param {any} sectionLabel     – например, "Глава"
 * @param {any} sectionIndex     – номер раздела (строка)
 */
function IndexYamlEntryPatchSection(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex = '') {
    const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
    if (!fs.existsSync(yamlPath)) {
        console.warn(`index.yaml не найден: ${yamlPath}`);
        return;
    }

    // Загружаем существующий объект
    let data = loadIndexYaml(yamlPath);
    if (data === null) return;

    // Формируем объект, совместимый с updateIndexYaml
    /** @type {import('../model/section.model').SectionTypeOption} */
    const newSectionType = {
        value: sectionLabel,
        name: sectionTypeName,
        label: '',
        description: '',
    };

    // Применяем обновление
    updateIndexYaml(data, sectionIndex, newSectionType, pureTitle);

    // Сохраняем с теми же настройками, что и в IndexYamlEntryPatch
    const updatedContent = yaml.dump(data, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        quotingType: '"',
    });

    fs.writeFileSync(yamlPath, updatedContent, 'utf8');
}

/**
 * @param {IndexYaml} data
 * @param {string} userIndex
 * @param {import('../model/section.model').SectionTypeOption} newSectionType
 * @param {string} newPureTitle
 */
function updateIndexYaml(data, userIndex, newSectionType, newPureTitle) {
    const sectionIndex = userIndex?.trim() || '';
    const composedTitle = sectionIndex ? `${newSectionType.value} ${sectionIndex}. ${newPureTitle}` : newPureTitle;

    // Обновляем корневые поля
    data.title = composedTitle;
    data.description = `Описывает ${composedTitle}`;
    data.pureTitle = newPureTitle;

    // Обновляем meta
    /** @type {IndexYamlMeta} */
    let meta = data.meta || {};
    meta.title = composedTitle;
    meta.sectionType = newSectionType.name;
    meta.noIndex = true;
    meta.sectionIndex = sectionIndex;
    data.meta = meta;
}

module.exports = { IndexYamlEntryPatchHRef, IndexYamlEntryPatchSection, IndexYamlFileCreate };
