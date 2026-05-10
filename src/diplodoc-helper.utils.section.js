// diplodoc-helper.section.utils.js
const { FrontMatterSectionTypes } = require("./diplodoc-helper.utils.constants");

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

module.exports = { sectionTypes };
