// src/utils/toc.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { FrontMatterFiles, FrontMatterMeta, FrontMatterSectionTypesIndexed } = require("./constants");
const { get } = require("../utils/frontmatter");

/* ====================== ОБЩИЕ УТИЛИТЫ ====================== */

/**
 * @param {string} str
 */
function normalizeEmptyLines(str) {
  str = str.replace(/\r\n/g, "\n");
  str = str.replace(/\n\n/g, "\n");
  return str.replace(/(\r?\n[ \t]*){3,}/g, "\n").trimEnd() + "\n";
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
  const result = [
    `${indent}- name: ${composedTitle}`,
    `${indent}  href: ${folderName}/index.md`,
    `${indent}  include:`,
    `${indent}    path: ${folderName}/toc.yaml`,
    `${indent}    mode: link`,
  ];
  return normalizeEmptyLines(result.join("\n"));
}

/* ====================== УНИВЕРСАЛЬНОЕ ДОБАВЛЕНИЕ ====================== */

/**
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} folderName
 * @param {any} sectionType
 * @param {string | undefined} sectionIndex
 */
function addTocEntry(parentDir, composedTitle, folderName, sectionType, sectionIndex) {
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
 * @param {string} parentDir
 * @param {any} folderName
 */
function removeTocEntryByFolder(parentDir, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const var_part = escapeRegExp(folderName);

  // Собираем паттерн:
  // 1. Начало блока
  // 2. Обязательный href именем папки
  // 3. Жадный захват всего контента, пока не встретим новый "- name:" или конец файла
  const pattern = `^[ \\t]*- name:.*\\r?\\n[ \\t]*href:[ \\t]*${var_part}/index\\.md(?:(?!\\r?\\n[ \\t]*- name:)[\\s\\S])*`;

  const regex = new RegExp(pattern, "gm");

  // Удаляем блок и подчищаем лишние переносы строк, которые могли остаться
  content = content.replace(regex, "");

  fs.writeFileSync(tocPath, normalizeEmptyLines(content), "utf8");
}

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/* ====================== UPDATE INDEX.YAML ====================== */

/**
 * @param {string} parentDir
 * @param {any} oldFolderName
 * @param {any} newFolderName
 * @param {any} composedTitle
 */
function updateParentIndexYaml(
  parentDir,
  oldFolderName,
  newFolderName,
  composedTitle,
) {
  const indexPath = path.join(parentDir, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, "utf8");

  content = content.replace(
    new RegExp(`(href:\\s*)${oldFolderName}/`, "g"),
    `$1${newFolderName}/`,
  );

  const selfRegex = new RegExp(
    `(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldFolderName}/index\\.md`,
    "g",
  );
  content = content.replace(
    selfRegex,
    `$1${composedTitle}$3${newFolderName}/index.md`,
  );

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
  fs.writeFileSync(
    tocPath,
    yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }),
  );
}

/**
 * @param {{ items: any; }} tocDoc
 * @param {any} folderName
 * @param {any} newName
 */
function updateTocItemName(tocDoc, folderName, newName) {
  if (!tocDoc?.items) return;
  for (const item of tocDoc.items) {
    if (item.href && item.href.includes(folderName)) {
      item.name = newName;
    }
  }
}

/**
 * Сравнивает два индекса (например "1.2.3" и "1.10")
 * @param {string} a
 * @param {string} b
 */
function compareIndexes(a, b, order = "ascending") {
  if (!a || !b) return 0;
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const ai = i < aParts.length ? aParts[i] : 0;
    const bi = i < bParts.length ? bParts[i] : 0;
    if (ai !== bi) {
      return order === "ascending" ? ai - bi : bi - ai;
    }
  }
  return 0;
}

/**
 * Получает sectionIndex из index.md по ссылке из toc
 * @param {{ href: string; }} item
 * @param {string} baseDir
 */
function getItemIndex(item, baseDir) {
  if (!item?.href) return null;

  // Убираем /index.md если есть
  const targetDir = item.href.replace(/\/index\.md$/, "");
  const indexPath = path.join(baseDir, targetDir, FrontMatterFiles.INDEX_MD);

  if (!fs.existsSync(indexPath)) return null;

  const content = fs.readFileSync(indexPath, "utf8");
  const sectionType = get(content, FrontMatterMeta.SECTIONTYPE);

  if (!sectionType || !FrontMatterSectionTypesIndexed.includes(sectionType)) {
    return null;
  }

  return get(content, FrontMatterMeta.SECTIONINDEX) || null;
}

/**
 * Сортирует элементы в toc.yaml по sectionIndex
 * @param {{ items: any[]; }} tocDoc
 * @param {any} baseDir
 */
function sortTocItems(tocDoc, baseDir, sortOrder = "ascending", sortKind = "nonIndexedBottom") {
  if (!tocDoc?.items || tocDoc.items.length === 0 || sortOrder === "none") {
    return;
  }

  const itemsWithIndex = tocDoc.items.map((item) => ({
    item,
    index: getItemIndex(item, baseDir),
  }));

  const indexed = itemsWithIndex.filter((i) => i.index !== null);
  const nonIndexed = itemsWithIndex.filter((i) => i.index === null);

  // Сортируем только индексированные
  indexed.sort((a, b) => compareIndexes(a.index, b.index, sortOrder));

  // Собираем обратно
  tocDoc.items = sortKind === "nonIndexedTop"
    ? [...nonIndexed.map(i => i.item), ...indexed.map(i => i.item)]
    : [...indexed.map(i => i.item), ...nonIndexed.map(i => i.item)];
}
/* ====================== ЭКСПОРТ ====================== */

module.exports = {
  addTocEntry,
  removeTocEntryByFolder,
  updateParentIndexYaml,
  getTocIndentation,
  indentedTocEntry,
  normalizeEmptyLines,

  patchParentToc: addTocEntry,

  sortTocItems,
  loadTocFromFile,
  saveTocToFile,
  updateTocItemName,
};
