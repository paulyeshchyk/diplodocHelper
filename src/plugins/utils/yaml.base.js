/** @typedef {Object} TocYamlItemInclude
 * @property {string} path
 */

/** @typedef {Object} TocYamlItem
 * @property {string | undefined} href
 * @property {TocYamlItemInclude | undefined} include
 */

/** @typedef {Object} TocYaml
 * @property {TocYamlItem[] | undefined} items
 */

/**
 * @typedef {Object} YamlTocInsertPosition
 * @property {string} label - Текст для QuickPick
 * @property {string} position - Куда именно вставляем
 * @property {string} [afterName] - Имя папки, ПОСЛЕ которой нужно вставить (если position === 'after')
 */

/**
 * @typedef {Object} TocBlocksAccumulator
 * @property {string} header
 * @property {string[]} blocks
 * @property {string[] | null} current
 */

/**
 * @typedef {Object} IndexYamlMeta
 * @property {string} title - Заголовок для мета-тега (совпадает с основным title)
 * @property {any} sectionType - Тип раздела, переданный в аргументе sectionType (может быть строкой, числом и т.д.)
 * @property {string} sectionIndex
 * @property {boolean} noIndex - Флаг запрета индексации (всегда true)
 */

/**
 * @typedef {Object} IndexYaml
 * @property {string} title - Заголовок страницы (финальное значение, вычисленное через TEMPLATE_FINAL_TITLE)
 * @property {string} description - Описание страницы (всегда начинается с "Описывает ")
 * @property {string} pureTitle
 * @property {IndexYamlMeta} meta - Блок метаданных
 */
