// src/utils/section.js
const { FrontMatterMeta, FrontMatterSectionTypes } = require("./constants");
const { get } = require("./frontmatter");

/** @import {SectionTypeOption, SectionInfo} from  './diplodocTypes'*/

/**
 * Возвращает список доступных типов разделов
 * @returns {SectionTypeOption[]}
 */
function sectionTypes() {
  return [
    {
      value: "Часть",
      label: "Часть",
      name: FrontMatterSectionTypes.PART,
      description: "Структурная единица руководства, представляющая собой наиболее крупную ступень его деления",
    },
    {
      value: "Раздел",
      label: "Раздел",
      name: FrontMatterSectionTypes.SECTION,
      description: "Крупная рубрика, являющаяся одной из высших ступеней деления основного текста",
    },
    {
      value: "Глава",
      label: "Глава",
      name: FrontMatterSectionTypes.CHAPTER,
      description: "Крупная рубрика, имеющая самостоятельный заголовок",
    },
    {
      value: "",
      label: "Статья",
      name: FrontMatterSectionTypes.PAGE,
      description: "",
    },
  ];
}

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
  sectionTypes,
  getSectionMetadata,
};