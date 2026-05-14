// src/utils/toc.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { FrontMatterFiles } = require("./constants");


/* ====================== ЭКСПОРТ ====================== */

const { TEMPLATE_TOC_YAML } = require("./templates");

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function TocYamlFileCreate(folderPath, title, sectionLabel, sectionIndex) {
  const filePath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  fs.writeFileSync(
    filePath,
    TEMPLATE_TOC_YAML(title, sectionLabel, sectionIndex),
    "utf8",
  );
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 */
function TocYamlFileLoad(tocPath) {
  const content = fs.readFileSync(tocPath, "utf8");
  return yaml.load(content);
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @param {any} tocDoc
 */
function TocYamlFileSave(tocPath, tocDoc) {
  fs.writeFileSync(
    tocPath,
    yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }),
  );
}
module.exports = {
  TocYamlFileLoad,
  TocYamlFileSave,

  TocYamlFileCreate,
};
