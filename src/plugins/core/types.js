// src/core/plugin/types.js
/**
 * @typedef {Object} Plugin
 * @property {string} name
 * @property {(context: PluginContext) => Promise<PluginExecutionResult> | PluginExecutionResult} run
 */

/**
 * @typedef {Object} PluginExecutionResult
 * @property {string[]} success
 * @property {string[]} failed
 */

/**
 * @typedef {Object} PluginContext
 * @property {string} rootDir
 * @property {string} [buildDir]
 * @property {string} [lang]
 */

/**
 * @typedef {Object} PageInfo
 * @property {string} title
 * @property {string} href
 */

/**
 * @typedef {Object} ContextData
 * @property {number} rank
 * @property {PageInfo[]} pages
 */

/**
 * @typedef {Object.<string, ContextData>} ContextMap
 */

module.exports = [];
