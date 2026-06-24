const { FrontMatterMeta, FrontMatterToc, FrontMatterFiles } = require('../model/frontmatter.model');
const { TEMPLATE_FINAL_TITLE } = require('../model/frontmatter.templates');

/**
 * @param {string} title
 * @param {string} sectionType
 * @param {string} sectionValue
 * @param {string} sectionIndex
 */
function GET_INDEX_YAML_OBJECT(title, sectionType, sectionValue, sectionIndex) {
    const finalTitle = TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title);

    // Возвращаем чистый объект. Библиотека сама поймет, где сделать отступы.
    return {
        [FrontMatterMeta.TITLE]: finalTitle,
        [FrontMatterMeta.DESCRIPTION]: `Описывает ${finalTitle}`,
        [FrontMatterMeta.META]: {
            [FrontMatterMeta.META_TITLE]: finalTitle,
            [FrontMatterMeta.META_SECTIONTYPE]: sectionType,
            [FrontMatterMeta.META_NOINDEX]: true,
        },
    };
}

/**
 * @param {string} composedTitle
 * @param {string} folderName
 * @param {string | undefined} sectionIndex
 */
function GET_INDEX_YAML_OBJECT_EXTENDED(composedTitle, folderName, sectionIndex) {
    return {
        [FrontMatterToc.ITEMS_NAME]: composedTitle,
        [FrontMatterToc.ITEMS_HREF]: `${folderName}/${FrontMatterFiles.INDEX_MD}`,
        [FrontMatterToc.ITEMS_INCLUDE]: {
            [FrontMatterToc.ITEMS_INCLUDE_PATH]: `${folderName}/${FrontMatterFiles.TOC_YAML}`,
            [FrontMatterToc.ITEMS_INCLUDE_MODE]: 'link',
        },
        // Необязательно: сохраняем скрытый маркер индекса для удобной сортировки в будущем,
        // чтобы не лезть в дочерние файлы при каждой сортировке.
        // Если Diplodoc ругается на лишние поля, этот шаг можно пропустить и читать из index.md, как раньше.
        _sectionIndex: sectionIndex ? parseInt(sectionIndex, 10) : null,
    };
}

/**
 * @param {string} sectionValue
 * @param {string} sectionIndex
 * @param {string} title
 * @param {any} sectionType
 */
function GET_INDEX_MD_OBJECT(sectionValue, sectionIndex, title, sectionType) {
    return {
        [FrontMatterMeta.TITLE]: TEMPLATE_FINAL_TITLE(sectionValue, sectionIndex, title),
        [FrontMatterMeta.SECTIONTYPE]: sectionType,
        [FrontMatterMeta.PURETITLE]: title,
        [FrontMatterMeta.SECTIONINDEX]: sectionIndex,
    };
}
/**
 * @param {string} name
 * @param {string} sectionLabel
 * @param {string} folderName
 * @param {string | undefined} sectionIndex
 */
function GET_PARENT_TOC_ITEM_OBJECT(name, sectionLabel, folderName, sectionIndex) {
    // Структура элемента внутри массива items
    return {
        [FrontMatterToc.ITEMS_NAME]: name,
        [FrontMatterToc.ITEMS_HREF]: `${folderName}/${FrontMatterFiles.INDEX_MD}`,
        [FrontMatterToc.ITEMS_INCLUDE]: {
            [FrontMatterToc.ITEMS_INCLUDE_PATH]: `${folderName}/${FrontMatterFiles.TOC_YAML}`,
            [FrontMatterToc.ITEMS_INCLUDE_MODE]: 'link',
        },
    };
}

/**
 * @param {string} title
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function GET_TOC_YAML_OBJECT(title, sectionLabel, sectionIndex) {
    return {
        [FrontMatterToc.TITLE]: TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title),
        [FrontMatterToc.HREF]: FrontMatterFiles.INDEX_YAML,
    };
}

/**
 * @param {string} composedTitle
 * @param {string} newFolderName
 */
function GET_TOC_YAML_OBJECT_EXT(composedTitle, newFolderName) {
    return {
        [FrontMatterToc.ITEMS_NAME]: composedTitle,
        [FrontMatterToc.ITEMS_HREF]: `${newFolderName}/${FrontMatterFiles.INDEX_MD}`,
        [FrontMatterToc.ITEMS_INCLUDE]: {
            [FrontMatterToc.ITEMS_INCLUDE_PATH]: `${newFolderName}/${FrontMatterFiles.TOC_YAML}`,
            [FrontMatterToc.ITEMS_INCLUDE_MODE]: 'link',
        },
    };
}

/**
 * @param {string} composedTitle
 * @param {string} folderName
 */
function GET_TOC_YAML_OBJECT_EXTEND_2(composedTitle, folderName) {
    return {
        [FrontMatterToc.ITEMS_NAME]: composedTitle,
        [FrontMatterToc.ITEMS_HREF]: `${folderName}/${FrontMatterFiles.INDEX_MD}`,
        [FrontMatterToc.ITEMS_INCLUDE]: {
            [FrontMatterToc.ITEMS_INCLUDE_PATH]: `${folderName}/${FrontMatterFiles.TOC_YAML}`,
            [FrontMatterToc.ITEMS_INCLUDE_MODE]: 'link',
        },
    };
}

module.exports = {
    GET_INDEX_YAML_OBJECT,
    GET_PARENT_TOC_ITEM_OBJECT,
    GET_TOC_YAML_OBJECT,
    GET_INDEX_MD_OBJECT,
    GET_INDEX_YAML_OBJECT_EXTENDED,
    GET_TOC_YAML_OBJECT_EXTEND_2,
    GET_TOC_YAML_OBJECT_EXT,
};
