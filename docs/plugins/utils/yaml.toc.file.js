// src/plugins/utils/toc.js
const fs = require('fs');
const yaml = require('js-yaml');

/* ====================== ЭКСПОРТ ====================== */

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
 * @param {fs.PathOrFileDescriptor} tocPath
 * @returns {TocYaml}
 */
function TocYamlFileLoad(tocPath) {
    const content = fs.readFileSync(tocPath, 'utf8');
    return /** @type {TocYaml} */ (yaml.load(content));
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @param {any} tocDoc
 */
function TocYamlFileSave(tocPath, tocDoc) {
    fs.writeFileSync(tocPath, yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }));
}

module.exports = {
    TocYamlFileLoad,
    TocYamlFileSave,
};
