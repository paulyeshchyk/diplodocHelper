// utils/sectionTitle.js

const { FrontMatterSectionTypesIndexed } = require('./constants');
const { TEMPLATE_FOLDER_NAME } = require('./templates');

/**
 * @param {import("./diplodocTypes").SectionTypeOption} sectionType
 */
function isIndexedSectionType(sectionType) {
  return FrontMatterSectionTypesIndexed.includes(sectionType.name);
}

/**
 * Формирует префикс заголовка (тип + индекс)
 * @param {string | undefined} index
 * @param {import("./diplodocTypes").SectionTypeOption} sectionType
 * @returns {string}
 */
function composeTitlePrefix(index, sectionType) {
  const hasPrefix = !!sectionType.value;
  const hasIndex = !!index;

  if (hasPrefix && hasIndex) return `${sectionType.value} ${index}. `;
  if (hasPrefix && !hasIndex) return sectionType.value;
  if (!hasPrefix && hasIndex) return `${index}. `;
  return '';
}

/**
 * Полный заголовок раздела (для index.md, index.yaml, toc.yaml)
 * @param {string | undefined} index
 * @param {import("./diplodocTypes").SectionTypeOption} sectionType
 * @param {string} pureTitle - "чистое" название (без префикса)
 * @returns {string}
 */
function composeFullTitle(index, sectionType, pureTitle) {
  const prefix = composeTitlePrefix(index, sectionType);
  if (!prefix && !index && !sectionType.value) return pureTitle;
  return prefix + pureTitle;
}

/**
 * Имя папки (нормализованное: транслит, lower case, замена пробелов и т.д.)
 * Использует composeFullTitle или отдельную логику, если требуется отличие.
 * @param {string} index
 * @param {import("./diplodocTypes").SectionTypeOption} sectionType
 * @param {string} pureTitle
 * @returns {string}
 */
function composeFolderName(index, sectionType, pureTitle) {
  // Предположим, что TEMPLATE_FOLDER_NAME уже реализует нужное правило
  // Но важно, чтобы оно использовало те же index и sectionType, что и composeFullTitle
  return TEMPLATE_FOLDER_NAME(sectionType, pureTitle, index);
}

module.exports = { composeFullTitle, composeFolderName, isIndexedSectionType };
