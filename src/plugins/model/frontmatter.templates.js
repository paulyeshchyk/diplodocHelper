// src/utils/templates.js
const { FrontMatterMeta, FrontMatterToc, FrontMatterFiles } = require('./frontmatter.model');

/**
 * Формирует финальный заголовок с префиксом
 * @param {string} sectionValue
 * @param {string} sectionIndex
 * @param {string} title
 */
function TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title) {
    if (!sectionValue || sectionValue.trim() === '') {
        return title;
    }

    const leftPart = sectionIndex.trim().length === 0 ? sectionValue : `${sectionValue} ${sectionIndex.trim()}`;
    return `${leftPart}. ${title}`;
}

const TEMPLATE_INDEX_MD = (
    /** @type {string} */ title,
    /** @type {any} */ sectionType,
    /** @type {string} */ sectionValue,
    /** @type {string} */ sectionIndex
) =>
    [
        `---`,
        `${FrontMatterMeta.TITLE}: ${TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title)}`,
        `${FrontMatterMeta.SECTIONTYPE}: ${sectionType}`,
        `${FrontMatterMeta.PURETITLE}: ${title}`,
        `${FrontMatterMeta.SECTIONINDEX}: ${sectionIndex}`,
        `---`,
    ].join('\n');

/**
 * @param {string} title
 * @param {any} sectionType
 * @param {string} sectionValue
 * @param {string} sectionIndex
 */
function TEMPLATE_INDEX_YAML(title, sectionType, sectionValue, sectionIndex) {
    const finalTitle = TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title);
    return [
        `${FrontMatterMeta.TITLE}: ${finalTitle}`,
        `${FrontMatterMeta.DESCRIPTION}: Описывает ${finalTitle}`,
        `${FrontMatterMeta.META}:`,
        `  ${FrontMatterMeta.META_TITLE}: ${finalTitle}`,
        `  ${FrontMatterMeta.META_SECTIONTYPE}: ${sectionType}`,
        `  ${FrontMatterMeta.META_NOINDEX}: true`,
    ].join('\n');
}

const TEMPLATE_TOC_YAML = (
    /** @type {string} */ title,
    /** @type {string} */ sectionLabel,
    /** @type {string} */ sectionIndex
) =>
    [
        `${FrontMatterToc.TITLE}: ${TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title)}`,
        `${FrontMatterToc.HREF}: ${FrontMatterFiles.INDEX_YAML}`,
    ].join('\n');

const TEMPLATE_PARENT_TOC_YAML = (
    /** @type {string} */ name,
    /** @type {string} */ sectionLabel,
    /** @type {any} */ folderName,
     
    /** @type {string} */ sectionIndex
) =>
    [
        `  - ${FrontMatterToc.ITEMS_NAME}: ${name}`,
        `    ${FrontMatterToc.ITEMS_HREF}: ${folderName}/${FrontMatterFiles.INDEX_MD}`,
        `    ${FrontMatterToc.ITEMS_INCLUDE}:`,
        `      ${FrontMatterToc.ITEMS_INCLUDE_PATH}: ${folderName}/${FrontMatterFiles.TOC_YAML}`,
        `      ${FrontMatterToc.ITEMS_INCLUDE_MODE}: link`,
    ].join('\n');

/** @import {SectionTypeOption} from  './section.model'*/

/**
 * Генерирует имя папки раздела
 *
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionName
 * @param {string | undefined} sectionIndex
 * @returns {string}
 */
function TEMPLATE_FOLDER_NAME(sectionType, sectionName, sectionIndex = '') {
    const cleanName = sectionName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '');
    const hasType = !!sectionType.value?.trim();
    const hasIndex = !!(sectionIndex && sectionIndex.trim() !== '');

    // 1. Есть и тип, и индекс
    if (hasType && hasIndex) {
        return `${sectionType.label}${sectionIndex.trim()}.${cleanName}`;
    }
    // 2. Есть тип, но нет индекса
    if (hasType && !hasIndex) {
        return `${sectionType.label}.${cleanName}`;
    }
    // 3. Нет типа, но есть индекс
    if (!hasType && hasIndex) {
        return `${sectionIndex.trim()}.${cleanName}`;
    }
    // 4. Нет ни типа, ни индекса
    return cleanName;
}

module.exports = {
    TEMPLATE_FINAL_TITLE,
    TEMPLATE_INDEX_MD,
    TEMPLATE_INDEX_YAML,
    TEMPLATE_TOC_YAML,
    TEMPLATE_PARENT_TOC_YAML,
    TEMPLATE_FOLDER_NAME,
};
