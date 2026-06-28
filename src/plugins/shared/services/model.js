/**
 * @typedef {Object} UpdateResponse
 * @property {boolean} success
 * @property {string[]} [contexts]
 * @property {string} [error]
 * @property {string} [message]
 * @property {string} [finalString]
 */

/**
 * Результат диалога ввода контекста.
 * @typedef {Object} UpdateContextResult
 * @property {string} [action]
 * @property {string} [newContext]
 * @property {string} [oldValue]
 * @property {string} [error]
 * @property {string} [message]
 * @property {string} [value]
 * @property {boolean} [cancelled]
 */
