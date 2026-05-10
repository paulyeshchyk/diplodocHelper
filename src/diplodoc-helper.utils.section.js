// diplodoc-helper.section.utils.js
const { FrontMatterMeta, FrontMatterSectionTypes } = require("./diplodoc-helper.utils.constants");
const { getFrontmatterValue } = require("./diplodoc-helper.utils.frontmatter");

/**
 * @typedef {Object} SectionTypeOption
 * @property {string} label
 * @property {string} name
 * @property {string} description
 */

/**
 * @returns {SectionTypeOption[]}
 */
function sectionTypes() {
  return [
    {
      label: "Часть",
      name: FrontMatterSectionTypes.PART,
      description: "Структурная единица руководства, представляющая собой наиболее крупную ступень его деления",
    },
    {
      label: "Раздел",
      name: FrontMatterSectionTypes.SECTION,
      description: "Крупная рубрика, являющаяся одной из высших ступеней деления основного текста",
    },
    {
      label: "Глава",
      name: FrontMatterSectionTypes.CHAPTER,
      description: "Крупная рубрика, имеющая самостоятельный заголовок",
    },
    { 
      label: "Статья", 
      name: FrontMatterSectionTypes.PAGE, 
      description: "" 
    },
  ];
}

/**
 * Извлекает тип раздела из содержимого index.md.
 * @param {string} content - Содержимое файла index.md
 * @returns {string | null}
 */
function getSectionTypeFromContent(content) {
  return getFrontmatterValue(content, FrontMatterMeta.SECTIONTYPE);
}

/**
 * Извлекает чистый заголовок из содержимого index.md.
 * @param {string} content
 * @returns {string | null}
 */
function getPureTitleFromContent(content) {
  const pure = getFrontmatterValue(content, FrontMatterMeta.PURETITLE);
  if (pure) return pure;
  // fallback на TITLE (удалить префикс типа и индекса)
  const title = getFrontmatterValue(content, FrontMatterMeta.TITLE);
  if (title) {
    // Удаляем "Часть 1. " или "Раздел 2.3. " – возможно, лучше вернуть как есть
    return title;
  }
  return null;
}

/**
 * Извлекает индекс раздела из содержимого index.md.
 * @param {string} content
 * @returns {string | null}
 */
function getSectionIndexFromContent(content) {
  return getFrontmatterValue(content, FrontMatterMeta.SECTIONINDEX);
}

/**
 * Возвращает все метаданные раздела в одном объекте.
 * @param {string} content
 * @returns {{ sectionType: string | null, pureTitle: string | null, sectionIndex: string | null }}
 */
function getSectionMetadata(content) {
  return {
    sectionType: getSectionTypeFromContent(content),
    pureTitle: getPureTitleFromContent(content),
    sectionIndex: getSectionIndexFromContent(content),
  };
}

module.exports = {
  sectionTypes,
  getSectionTypeFromContent,
  getPureTitleFromContent,
  getSectionIndexFromContent,
  getSectionMetadata,
};
