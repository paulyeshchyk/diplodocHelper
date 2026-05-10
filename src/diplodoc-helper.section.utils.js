// diplodoc-helper.section.utils.js
const { FrontMatterSectionTypes } = require("./diplodoc-helper.constants");

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
