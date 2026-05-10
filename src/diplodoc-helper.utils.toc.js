const { FrontMatterFiles } = require("./diplodoc-helper.utils.constants");

/**
 * @param {string} indent
 * @param {string} composedTitle
 * @param {string} newFolderName
 * @returns {string}
 */
function indentedTocEntry(indent, composedTitle, newFolderName) {
  const lines = [
    `${indent}- name: ${composedTitle}`,
    `${indent}  href: ${newFolderName}/${FrontMatterFiles.INDEX_MD}`,
    `${indent}  include:`,
    `${indent}    path: ${newFolderName}/${FrontMatterFiles.TOC_YAML}`,
    `${indent}    mode: link`,
  ];
  return lines.join("\n");
}

module.exports = {
  indentedTocEntry,
};
