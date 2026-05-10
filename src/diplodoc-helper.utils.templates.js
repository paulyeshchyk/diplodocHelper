const {
  FrontMatterMeta,
  FrontMatterToc,
  FrontMatterFiles
} = require("./diplodoc-helper.utils.constants");

// --- ШАБЛОНЫ (Константы) ---
/**
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 * @param {string} title
 */
function TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title) {
  var leftPart =
    sectionIndex.trim().length == 0
      ? `${sectionLabel}`
      : `${sectionLabel} ${sectionIndex.trim()}`;

  return `${leftPart}. ${title}`;
}

const TEMPLATE_INDEX_MD = (
  /** @type {string} */ title,
  /** @type {string} */ sectionType,
  /** @type {string} */ sectionLabel,
  /** @type {string} */ sectionIndex,
) =>
  [
    `---`,
    `${FrontMatterMeta.TITLE}: ${TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title)}`,
    `${FrontMatterMeta.SECTIONTYPE}: ${sectionType}`,
    `${FrontMatterMeta.PURETITLE}: ${title}`,
    `${FrontMatterMeta.SECTIONINDEX}: ${sectionIndex}`,
    `---`,
  ].join("\n");

/**
 * @param {string} title
 * @param {string} sectionType
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function TEMPLATE_INDEX_YAML(title, sectionType, sectionLabel, sectionIndex) {
  const finalTitle = TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title);
  return [
    `${FrontMatterMeta.TITLE}: ${finalTitle}`,
    `${FrontMatterMeta.DESCRIPTION}: Описывает ${finalTitle}`,
    `${FrontMatterMeta.META}:`,
    `  ${FrontMatterMeta.META_TITLE}: ${finalTitle}`,
    `  ${FrontMatterMeta.META_SECTIONTYPE}: ${sectionType}`,
    `  ${FrontMatterMeta.META_NOINDEX}: true`,
  ].join("\n");
}

const TEMPLATE_TOC_YAML = (
  /** @type {string} */ title,
  /** @type {string} */ sectionLabel,
  /** @type {string} */ sectionIndex,
) =>
  [
    `${FrontMatterToc.TITLE}: ${TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, title)}`,
    `${FrontMatterToc.HREF}: ${FrontMatterFiles.INDEX_YAML}`,
  ].join("\n");

const TEMPLATE_PARENT_TOC_YAML = (
  /** @type {string} */ name,
  /** @type {string} */ sectionLabel,
  /** @type {string} */ folderName,
  /** @type {string} */ sectionIndex,
) =>
  [
    `  - ${FrontMatterToc.ITEMS_NAME}: ${TEMPLATE_FINAL_TITLE(sectionLabel, sectionIndex, name)}`,
    `    ${FrontMatterToc.ITEMS_HREF}: ${folderName}/${FrontMatterFiles.INDEX_MD}`,
    `    ${FrontMatterToc.ITEMS_INCLUDE}:`,
    `      ${FrontMatterToc.ITEMS_INCLUDE_PATH}: ${folderName}/${FrontMatterFiles.TOC_YAML}`,
    `      ${FrontMatterToc.ITEMS_INCLUDE_MODE}: link`,
  ].join("\n");


/**
 * @param {{ label: any; name?: string; description?: string; }} sectionType
 * @param {string} sectionName
 */
function TEMPLATE_FOLDER_NAME(sectionType, sectionName) {
  return [
    sectionType.label,
    sectionName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, ""),
  ].join(".");
}

// --- exports ---

module.exports = {
  TEMPLATE_FINAL_TITLE,
  TEMPLATE_INDEX_MD,
  TEMPLATE_INDEX_YAML,
  TEMPLATE_TOC_YAML,
  TEMPLATE_PARENT_TOC_YAML,
  TEMPLATE_FOLDER_NAME,
};
