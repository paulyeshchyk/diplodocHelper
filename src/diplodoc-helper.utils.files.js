//diplodoc-helper.utils.js

const fs = require("fs");
const vscode = require("vscode");
const path = require("path");
const {
  FrontMatterFiles,
  FrontMatterFilesDefaultList,
} = require("./diplodoc-helper.utils.constants");
const {
  TEMPLATE_INDEX_MD,
  TEMPLATE_INDEX_YAML,
  TEMPLATE_TOC_YAML,
  TEMPLATE_PARENT_TOC_YAML,
  TEMPLATE_FOLDER_NAME,
} = require("./diplodoc-helper.utils.templates");

/** @import {SectionTypeOption} from './diplodoc-helper.utils.section' */

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * (содержит обязательную тройку файлов)
 * @param {string} folderPath
 * @returns {boolean}
 */
function isDiplodocSection(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return false;
  return FrontMatterFilesDefaultList.every((file) =>
    fs.existsSync(path.join(folderPath, file)),
  );
}

/**
 * Проверяет, является ли папка корнем языка (например, docs/ru)
 * @param {string} folderPath
 * @returns {boolean}
 */
function isLanguageRoot(folderPath) {
  // Корень языка обычно содержит папку или файл оглавления,
  // но не обязательно является "разделом" в плане наличия index.yaml
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
 * @param {string} template
 * @param {any[]} args
 */
function format(template, ...args) {
  return template.replace(/{(\d+)}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return typeof args[argIndex] !== "undefined" ? args[argIndex] : match;
  });
}


/**
 * @param {string} folderPath
 */
function canCreateFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    vscode.window.showErrorMessage(
      `Ошибка: Путь уже существует: ${folderPath}`,
    );
    return false;
  }
  try {
    fs.accessSync(path.dirname(folderPath), fs.constants.W_OK);
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(
      `Нет прав на запись в директорию: ${path.dirname(folderPath)}`,
    );
    return false;
  }
}


/**
 * @param {string} folderPath
 * @param {string} title
 * @param {string} sectionType
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function createIndexMd(
  folderPath,
  title,
  sectionType,
  sectionLabel,
  sectionIndex,
) {
  const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  fs.writeFileSync(
    filePath,
    TEMPLATE_INDEX_MD(title, sectionType, sectionLabel, sectionIndex),
    "utf8",
  );
}

/**
 * @param {string} folderPath
 * @param {string} title
 * @param {string} sectionType
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function createIndexYaml(
  folderPath,
  title,
  sectionType,
  sectionLabel,
  sectionIndex,
) {
  const filePath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  fs.writeFileSync(
    filePath,
    TEMPLATE_INDEX_YAML(title, sectionType, sectionLabel, sectionIndex),
    "utf8",
  );
}

/**
 * @param {string} folderPath
 * @param {string} title
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function createTocYaml(folderPath, title, sectionLabel, sectionIndex) {
  const filePath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  fs.writeFileSync(
    filePath,
    TEMPLATE_TOC_YAML(title, sectionLabel, sectionIndex),
    "utf8",
  );
}

/**
 * @param {string} parentDir
 * @param {string} sectionTitle
 * @param {string} sectionType
 * @param {string} folderName
 * @param {string} sectionIndex
 */
function patchParentToc(
  parentDir,
  sectionTitle,
  sectionType,
  folderName,
  sectionIndex,
) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) {
    console.warn(
      `Родительский ${FrontMatterFiles.TOC_YAML} не найден в ${parentDir}`,
    );
    return;
  }
  let content = fs.readFileSync(tocPath, "utf8");
  const newItemEntry = TEMPLATE_PARENT_TOC_YAML(
    sectionTitle,
    sectionType,
    folderName,
    sectionIndex,
  );
  if (!content.includes("items:")) {
    content = content.trimEnd() + "\nitems:\n" + newItemEntry;
  } else {
    content = content.trimEnd() + "\n" + newItemEntry;
  }
  fs.writeFileSync(tocPath, content, "utf8");
}

/**
 * Создаёт папку для нового раздела.
 * @param {string} targetDir - родительская директория
 * @param {SectionTypeOption} sectionType - объект типа раздела (поля name, label)
 * @param {string} sectionName - имя раздела
 * @param {string} sectionIndex - индекс (строка)
 * @returns {{ folderPath: string, folderName: string } | null}
 */
function createSectionFolder(targetDir, sectionType, sectionName, sectionIndex) {
    const folderName = TEMPLATE_FOLDER_NAME(sectionType, sectionName);
    const newFolderPath = path.join(targetDir, folderName);

    if (!canCreateFolder(newFolderPath)) {
        return null;
    }

    try {
        fs.mkdirSync(newFolderPath, { recursive: true });
        return { folderPath: newFolderPath, folderName };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Критическая ошибка при создании папки: ${message}`);
        return null;
    }
}

module.exports = {
  isDiplodocSection,
  isLanguageRoot,
  isValidName,
  canCreateFolder,
  format,
  createIndexMd,
  createIndexYaml,
  createTocYaml,
  patchParentToc,
  createSectionFolder
};
