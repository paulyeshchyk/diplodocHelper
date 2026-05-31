/**
 * @typedef {Object} ConfigurationProperty
 * @property {string} type - Тип значения (например, "string", "boolean", "number").
 * @property {*} default - Значение по умолчанию.
 * @property {string} description - Описание настройки.
 * @property {Array<any>} [enum] - Список допустимых значений (опционально).
 * @property {Array<string>} [enumDescriptions] - Описания для каждого варианта из enum (опционально).
 */

/**
 * @typedef {Object} ContributesConfiguration
 * @property {string} title - Заголовок секции конфигурации.
 * @property {Record<string, ConfigurationProperty>} properties - Объект со свойствами конфигурации.
 */

/**
 * @typedef {Object} ConfigurationContributeResult
 * @property {Object} contributes - Корневой объект contributes.
 * @property {ContributesConfiguration} contributes.configuration - Секция конфигурации.
 */

/**
 * Генерирует секцию contributes.configuration для package.json
 * @returns {ConfigurationContributeResult}
 */

/**
 * @typedef {Object} ContributesManifest
 * @property {Array<Command>} [commands] - Список команд
 * @property {Object} [configuration] - Секция конфигурации
 * @property {Array<MenuContribution>} [menus] - Меню (пример)
 */

/**
 * @typedef {Object} Command
 * @property {string} command - Уникальный идентификатор команды
 * @property {string} title - Название команды
 * @property {string} [category] - Категория
 */

/**
 * @typedef {Object} MenuContribution
 * @property {string} command - Идентификатор команды
 * @property {string} [group] - Группа в меню
 * @property {string} [when] - Условие показа
 */

module.exports = {};
