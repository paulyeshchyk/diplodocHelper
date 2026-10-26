// /**
//  * @typedef {Object} Plugin
//  * @property {string} name
//  * @property {(context: PluginContext) => Promise<PluginExecutionResult> | PluginExecutionResult} run
//  */

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

module.exports = {};
