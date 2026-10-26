// IConfigDefinition.js

/**
 * @typedef {Object} ConfigField
 * @property {string} type - Тип значения ('string', 'number', 'boolean' и т.д.)
 * @property {any} default - Значение по умолчанию
 * @property {string} description - Описание параметра
 * @property {string[]} [enum] - Допустимые значения (опционально)
 * @property {string[]} [enumDescriptions] - Описания для вариантов enum (опционально)
 */

/**
 * @typedef {Object<string, ConfigField>} ConfigDefinition
 */

module.exports = {};
