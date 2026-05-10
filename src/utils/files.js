// src/utils/files.js
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { FrontMatterFiles, FrontMatterFilesDefaultList } = require("./constants");
const {
  TEMPLATE_INDEX_MD,
  TEMPLATE_INDEX_YAML,
  TEMPLATE_TOC_YAML,
  TEMPLATE_PARENT_TOC_YAML,
  TEMPLATE_FOLDER_NAME,
} = require("./templates");

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * @param {string} folderPath
 */
function isDiplodocSection(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return false;
  return FrontMatterFilesDefaultList.every((file) =>
    fs.existsSync(path.join(folderPath, file))
  );
}

/**
 * Проверяет, является ли папка корнем языка
 * @param {string} folderPath
 */
function isLanguageRoot(folderPath) {
  return fs.existsSync(path.join(folderPath, FrontMatterFiles.TOC_YAML));
}

/**
 * @param {string} name
 */
function isValidName(name) {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 255) return false;
  return true;
}

/**
 * @param {string} folderPath
 */
function canCreateFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    vscode.window.showErrorMessage(`Путь уже существует: ${folderPath}`);
    return false;
  }
  try {
    fs.accessSync(path.dirname(folderPath), fs.constants.W_OK);
    return true;
  } catch {
    vscode.window.showErrorMessage(`Нет прав на запись: ${path.dirname(folderPath)}`);
    return false;
  }
}

/* ==================== Создание раздела ==================== */

/**
 * @param {string} targetDir
 * @param {{ label: string; }} sectionType
 * @param {string} sectionName
 * @param {any} sectionIndex
 */
function createSectionFolder(targetDir, sectionType, sectionName, sectionIndex) {
  const folderName = TEMPLATE_FOLDER_NAME(sectionType, sectionName, sectionIndex);
  const newFolderPath = path.join(targetDir, folderName);

  if (!canCreateFolder(newFolderPath)) return null;

  try {
    fs.mkdirSync(newFolderPath, { recursive: true });
    return { folderPath: newFolderPath, folderName };
  } catch (err) {
    var msg = (err instanceof Error) ? err.message : "unknown"
    vscode.window.showErrorMessage(`Ошибка создания папки: ${msg}`);
    return null;
  }
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function createIndexMd(folderPath, title, sectionType, sectionLabel, sectionIndex) {
  const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  fs.writeFileSync(filePath, TEMPLATE_INDEX_MD(title, sectionType, sectionLabel, sectionIndex), "utf8");
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function createIndexYaml(folderPath, title, sectionType, sectionLabel, sectionIndex) {
  const filePath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  fs.writeFileSync(filePath, TEMPLATE_INDEX_YAML(title, sectionType, sectionLabel, sectionIndex), "utf8");
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function createTocYaml(folderPath, title, sectionLabel, sectionIndex) {
  const filePath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  fs.writeFileSync(filePath, TEMPLATE_TOC_YAML(title, sectionLabel, sectionIndex), "utf8");
}

/**
 * @param {string} parentDir
 * @param {any} sectionTitle
 * @param {any} sectionTypeLabel
 * @param {any} folderName
 * @param {any} sectionIndex
 */
function patchParentToc(parentDir, sectionTitle, sectionTypeLabel, folderName, sectionIndex) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const newItemEntry = TEMPLATE_PARENT_TOC_YAML(sectionTitle, sectionTypeLabel, folderName, sectionIndex);

  if (!content.includes("items:")) {
    content = content.trimEnd() + "\nitems:\n" + newItemEntry;
  } else {
    content = content.trimEnd() + "\n" + newItemEntry;
  }

  fs.writeFileSync(tocPath, content, "utf8");
}

// === Функции для Rename (обновление метаданных) ===

const { parse, stringify } = require("./frontmatter");
const { FrontMatterMeta } = require("./constants");

/**
 * Читает текущий sectionIndex
 * @param {string} folderPath
 * @returns {string}
 */
function readCurrentSectionIndex(folderPath) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return "";

  const content = fs.readFileSync(indexPath, "utf8");
  const { data } = parse(content);
  return String(data.sectionIndex || "");
}

/**
 * Обновляет index.md
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function updateIndexMdAdvanced(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return;

  const content = fs.readFileSync(indexPath, "utf8");
  let { data, content: body } = parse(content);

  const composedTitle = sectionIndex
    ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
    : pureTitle;

  data.title = composedTitle;
  data.pureTitle = pureTitle;
  data.sectionType = sectionTypeName;
  if (sectionIndex) {
    data.sectionIndex = sectionIndex;
  } else {
    delete data.sectionIndex;
  }

  fs.writeFileSync(indexPath, stringify(data, body), "utf8");
}

/**
 * Обновляет index.yaml
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function updateIndexYamlAdvanced(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
  const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(yamlPath)) return;

  const content = fs.readFileSync(yamlPath, "utf8");
  let { data, content: body } = parse(content);

  const composedTitle = sectionIndex
    ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
    : pureTitle;

  data.title = composedTitle;
  data.pureTitle = pureTitle;
  data.sectionType = sectionTypeName;
  if (sectionIndex) data.sectionIndex = sectionIndex;
  else delete data.sectionIndex;

  fs.writeFileSync(yamlPath, stringify(data, body), "utf8");
}

/**
 * Обновляет заголовок в toc.yaml раздела
 * @param {string} folderPath
 * @param {any} composedTitle
 */
function updateTocYamlTitle(folderPath, composedTitle) {
  const tocPath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const regex = /(title:\s*)(.*)/;
  content = content.replace(regex, `$1${composedTitle}`);
  fs.writeFileSync(tocPath, content, "utf8");
}

module.exports = {
  isDiplodocSection,
  isLanguageRoot,
  isValidName,
  canCreateFolder,
  createSectionFolder,
  createIndexMd,
  createIndexYaml,
  createTocYaml,
  patchParentToc,
  readCurrentSectionIndex,
  updateIndexMdAdvanced,
  updateIndexYamlAdvanced,
  updateTocYamlTitle,
};