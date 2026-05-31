// diplodocTypes.js
const { FrontMatterSectionTypes } = require('./frontmatter.model');

/**
 * @typedef {Object} SectionTypeOption
 * @property {string} label
 * @property {string} name
 * @property {string} value
 * @property {string} description
 */

/**
 * @typedef {Object} SectionInfo
 * @property {string | undefined} [title]
 * @property {string | undefined} [pureTitle]
 * @property {string | undefined} [sectionIndex]
 * @property {string | undefined} [sectionType]
 */

/**
 * Возвращает список доступных типов разделов
 * @returns {SectionTypeOption[]}
 */
function sectionTypes() {
    return [
        {
            value: 'Часть',
            label: 'Часть',
            name: FrontMatterSectionTypes.PART,
            description: 'Структурная единица руководства, представляющая собой наиболее крупную ступень его деления',
        },
        {
            value: 'Раздел',
            label: 'Раздел',
            name: FrontMatterSectionTypes.SECTION,
            description: 'Крупная рубрика, являющаяся одной из высших ступеней деления основного текста',
        },
        {
            value: 'Глава',
            label: 'Глава',
            name: FrontMatterSectionTypes.CHAPTER,
            description: 'Крупная рубрика, имеющая самостоятельный заголовок',
        },
        {
            value: '',
            label: 'Статья',
            name: FrontMatterSectionTypes.PAGE,
            description: '',
        },
    ];
}

module.exports = { sectionTypes };
