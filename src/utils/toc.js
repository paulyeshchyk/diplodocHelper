// src/utils/toc.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { FrontMatterFiles } = require("./constants");

/* ====================== ОБЩИЕ УТИЛИТЫ ====================== */

/**
 * @param {string} str
 */
function normalizeEmptyLines(str) {
  return str.replace(/\n\s*\n\s*\n/g, "\n\n").trimEnd() + "\n";
}

/**
 * @param {string} parentDir
 */
function getTocIndentation(parentDir) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return "  ";

  const content = fs.readFileSync(tocPath, "utf8");
  const match = content.match(/^(\s*)- \s*name:/m);
  return match ? match[1] : "  ";
}

/**
 * @param {string} indent
 * @param {any} composedTitle
 * @param {any} folderName
 */
function indentedTocEntry(indent, composedTitle, folderName) {
  return [
    `${indent}- name: ${composedTitle}`,
    `${indent}  href: ${folderName}/index.md`,
    `${indent}  include:`,
    `${indent}    path: ${folderName}/toc.yaml`,
    `${indent}    mode: link`,
  ].join("\n");
}

/* ====================== УНИВЕРСАЛЬНОЕ ДОБАВЛЕНИЕ ====================== */

/**
 * @param {string} parentDir
 * @param {any} composedTitle
 * @param {any} folderName
 */
function addTocEntry(parentDir, composedTitle, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const indent = getTocIndentation(parentDir);
  const newEntry = indentedTocEntry(indent, composedTitle, folderName);

  if (!content.includes("items:")) {
    content = content.trimEnd() + "\nitems:\n" + newEntry;
  } else {
    content = content.trimEnd() + "\n" + newEntry;
  }

  fs.writeFileSync(tocPath, normalizeEmptyLines(content), "utf8");
}

/* ====================== УДАЛЕНИЕ (ИСПРАВЛЕНО) ====================== */

/**
 * Надёжное удаление одной записи по имени папки
 * @param {string} parentDir
 * @param {any} folderName
 */
function removeTocEntryByFolder(parentDir, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");

  // Более безопасный и точный regex
  const regex = new RegExp(
    `^(\\s*)-\\s+name:.*?` +                    // начало элемента
    `href:\\s+${folderName}/index\\.md` +       // обязательный href с папкой
    `.*?` +                                     // всё до конца блока
    `(?=^\\s*-\\s+name:|^\\s*$)`,               // до следующего элемента или конца
    "gms"
  );

  content = content.replace(regex, "");

  fs.writeFileSync(tocPath, normalizeEmptyLines(content), "utf8");
}

/* ====================== UPDATE INDEX.YAML ====================== */

/**
 * @param {string} parentDir
 * @param {any} oldFolderName
 * @param {any} newFolderName
 * @param {any} composedTitle
 */
function updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle) {
  const indexPath = path.join(parentDir, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, "utf8");

  content = content.replace(
    new RegExp(`(href:\\s*)${oldFolderName}/`, "g"),
    `$1${newFolderName}/`
  );

  const selfRegex = new RegExp(
    `(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldFolderName}/index\\.md`,
    "g"
  );
  content = content.replace(selfRegex, `$1${composedTitle}$3${newFolderName}/index.md`);

  fs.writeFileSync(indexPath, content, "utf8");
}

/* ====================== REINDEX ====================== */

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 */
function loadTocFromFile(tocPath) {
  const content = fs.readFileSync(tocPath, "utf8");
  return yaml.load(content);
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @param {any} tocDoc
 */
function saveTocToFile(tocPath, tocDoc) {
  fs.writeFileSync(tocPath, yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }));
}

/**
 * @param {{ items: any; }} tocDoc
 * @param {any} folderName
 * @param {any} newName
 */
function updateTocItemName(tocDoc, folderName, newName) {
  if (!tocDoc?.items) return;
  for (const item of tocDoc.items) {
    if (item.href?.includes(folderName)) {
      item.name = newName;
    }
  }
}

/* ====================== ЭКСПОРТ ====================== */

module.exports = {
  addTocEntry,
  removeTocEntryByFolder,
  updateParentIndexYaml,
  getTocIndentation,
  indentedTocEntry,
  normalizeEmptyLines,

  // Совместимость
  patchParentToc: addTocEntry,

  // Reindex
  loadTocFromFile,
  saveTocToFile,
  updateTocItemName,
};