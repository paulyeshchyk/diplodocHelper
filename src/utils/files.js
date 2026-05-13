// src/utils/files.js
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const {
  FrontMatterFiles,
  FrontMatterFilesDefaultList,
} = require("./constants");
const {
  TEMPLATE_INDEX_MD,
  TEMPLATE_INDEX_YAML,
  TEMPLATE_TOC_YAML,
  TEMPLATE_PARENT_TOC_YAML,
  TEMPLATE_FOLDER_NAME,
} = require("./templates");

const { updateParentIndexYaml } = require("./toc");

/**
 * Проверяет, является ли папка полноценным разделом Diplodoc
 * @param {string} folderPath
 */
function isDiplodocSection(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return false;
  return FrontMatterFilesDefaultList.every((file) =>
    fs.existsSync(path.join(folderPath, file)),
  );
}

/**
 * Проверяет, является ли папка корнем языка (docs/ru)
 */
function isLanguageRoot(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return false;

  // Корень языка обычно содержит toc.yaml, но не является "разделом" в полном смысле
  const hasToc = fs.existsSync(
    path.join(folderPath, FrontMatterFiles.TOC_YAML),
  );
  const hasIndexMd = fs.existsSync(
    path.join(folderPath, FrontMatterFiles.INDEX_MD),
  );

  // Если есть index.md — это раздел, а не корень языка
  return hasToc && !hasIndexMd;
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
    vscode.window.showErrorMessage(
      `Нет прав на запись: ${path.dirname(folderPath)}`,
    );
    return false;
  }
}

/** @import {SectionTypeOption} from  './diplodocTypes'*/

/* ==================== Создание раздела ==================== */

/**
 * @param {string} targetDir
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionName
 * @param {any} sectionIndex
 */
function createSectionFolder(
  targetDir,
  sectionType,
  sectionName,
  sectionIndex,
) {
  const folderName = TEMPLATE_FOLDER_NAME(
    sectionType,
    sectionName,
    sectionIndex,
  );
  const newFolderPath = path.join(targetDir, folderName);

  if (!canCreateFolder(newFolderPath)) return null;

  try {
    fs.mkdirSync(newFolderPath, { recursive: true });
    return { folderPath: newFolderPath, folderName };
  } catch (err) {
    var msg = err instanceof Error ? err.message : "unknown";
    vscode.window.showErrorMessage(`Ошибка создания папки: ${msg}`);
    return null;
  }
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionValue
 * @param {any} sectionIndex
 */
function createIndexMd(
  folderPath,
  title,
  sectionType,
  sectionValue,
  sectionIndex,
) {
  const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  fs.writeFileSync(
    filePath,
    TEMPLATE_INDEX_MD(title, sectionType, sectionValue, sectionIndex),
    "utf8",
  );
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
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
 * @param {any} title
 * @param {any} sectionLabel
 * @param {any} sectionIndex
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
 * @param {any} sectionTitle
 * @param {any} sectionTypeLabel
 * @param {any} folderName
 * @param {any} sectionIndex
 */
function patchParentToc(
  parentDir,
  sectionTitle,
  sectionTypeLabel,
  folderName,
  sectionIndex,
) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const newItemEntry = TEMPLATE_PARENT_TOC_YAML(
    sectionTitle,
    sectionTypeLabel,
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

// === Функции для Rename (обновление метаданных) ===

const { parse, stringify } = require("./frontmatter");
const { FrontMatterMeta } = require("./constants");

/**
 * @param {string} folderPath
 * @returns {import("./diplodocTypes").SectionInfo?}
 */
function readCurrentSection(folderPath) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return null;

  const content = fs.readFileSync(indexPath, "utf8");
  const data = parse(content);
  return data.data;
}

/**
 * Читает текущий sectionIndex
 * @param {string} folderPath
 * @returns {string}
 */
function readCurrentSectionIndex(folderPath) {
  const data = readCurrentSection(folderPath);
  if (!data) return "";
  return String(data.sectionIndex || "");
}

/**
 * Читает текущий pureTitle
 * @param {string} folderPath
 * @returns {string}
 */
function readCurrentPureTitle(folderPath) {
  const data = readCurrentSection(folderPath);
  if (!data) return "";
  return String(data.pureTitle || data.title || "");
}

/**
 * Обновляет index.md
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function updateIndexMdAdvanced(
  folderPath,
  pureTitle,
  sectionTypeName,
  sectionLabel,
  sectionIndex,
) {
  console.log(
    `updateIndexMdAdvanced:  ${folderPath}\ ${sectionLabel}\ ${pureTitle}`,
  );
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
function updateIndexYamlAdvanced(
  folderPath,
  pureTitle,
  sectionTypeName,
  sectionLabel,
  sectionIndex = "",
) {
  const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(yamlPath)) return;

  let content = fs.readFileSync(yamlPath, "utf8");

  const composedTitle =
    sectionIndex && sectionIndex.trim() !== ""
      ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
      : pureTitle;

  // Простая замена по ключам
  content = content.replace(/^title:.*/m, `title: ${composedTitle}`);

  content = content.replace(/^pureTitle:.*/m, `pureTitle: ${pureTitle}`);

  content = content.replace(
    /^sectionType:.*/m,
    `sectionType: ${sectionTypeName}`,
  );

  if (sectionIndex && sectionIndex.trim() !== "") {
    content = content.replace(
      /^sectionIndex:.*/m,
      `sectionIndex: ${sectionIndex}`,
    );
  } else {
    content = content.replace(/^sectionIndex:.*\r?\n?/m, "");
  }

  fs.writeFileSync(yamlPath, content, "utf8");
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

/**
 * Полностью обновляет index.md И index.yaml раздела при изменении индекса/заголовка
 * @param {string} folderPath
 * @param {any} pureTitle
 * @param {any} sectionTypeName
 * @param {any} sectionLabel
 * @param {string} sectionIndex
 */
function updateSectionMetadata(
  folderPath,
  pureTitle,
  sectionTypeName,
  sectionLabel,
  sectionIndex = "",
) {
  const composedTitle =
    sectionIndex && sectionIndex.trim() !== ""
      ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
      : pureTitle;

  // index.md используем gray-matter (это frontmatter)
  updateIndexMdAdvanced(
    folderPath,
    pureTitle,
    sectionTypeName,
    sectionLabel,
    sectionIndex,
  );

  // index.yaml обычный YAML, gray-matter здесь не нужен!
  updateIndexYamlAdvanced(
    folderPath,
    pureTitle,
    sectionTypeName,
    sectionLabel,
    sectionIndex,
  );

  // toc.yaml своего раздела
  updateTocYamlTitle(folderPath, composedTitle);
}

/**
 * Переименовывает папку раздела в правильный формат, если нужно
 * @param {string} folderPath - текущий путь к папке раздела
 * @param {string} pureTitle
 * @param {SectionTypeOption} sectionType
 * @param {string} sectionIndex
 * @returns {string} новое имя папки
 */
function renameSectionFolderIfNeeded(
  folderPath,
  pureTitle,
  sectionType,
  sectionIndex = "",
) {
  const oldFolderName = path.basename(folderPath);
  const newFolderName = TEMPLATE_FOLDER_NAME(
    sectionType,
    pureTitle,
    sectionIndex,
  );
  console.log(
    `renameSectionFolderIfNeeded:\n from: ${oldFolderName}\n   to: ${newFolderName}`,
  );

  if (oldFolderName === newFolderName) {
    return oldFolderName;
  }

  const parentDir = path.dirname(folderPath);
  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath)) {
    console.warn(
      `Конфликт имён: ${newFolderName} уже существует. Папка ${oldFolderName} не переименована.`,
    );
    return oldFolderName;
  }

  try {
    fs.renameSync(folderPath, newFolderPath);
    console.log(`   Переименована: ${oldFolderName}  ${newFolderName}`);

    // Обновляем ссылки в родителе
    updateParentReferences(parentDir, oldFolderName, newFolderName);

    return newFolderName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Не удалось переименовать ${oldFolderName}:`, msg);
    return oldFolderName;
  }
}

/**
 * Обновляет все ссылки на папку в родительском toc.yaml и index.yaml
 * @param {string} parentDir
 * @param {string | RegExp} oldFolderName
 * @param {string} newFolderName
 */
function updateParentReferences(parentDir, oldFolderName, newFolderName) {
  // Обновляем toc.yaml родителя
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (fs.existsSync(tocPath)) {
    let content = fs.readFileSync(tocPath, "utf8");
    content = content.replace(new RegExp(oldFolderName, "g"), newFolderName);
    fs.writeFileSync(tocPath, content, "utf8");
  }

  // Обновляем index.yaml родителя
  updateParentIndexYaml(parentDir, oldFolderName, newFolderName, ""); // composedTitle не нужен здесь
}

/**
 * Проверяет, пуста ли папка (нет файлов и подпапок)
 * @param {string} dirPath
 * @returns {boolean}
 */
function isEmptyDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return true;
  try {
    const entries = fs.readdirSync(dirPath);
    return entries.length === 0;
  } catch (e) {
    return false;
  }
}

/**
 * Рекурсивно удаляет пустые папки вверх по дереву.
 * Останавливается на stopAtPath (корень языка) или когда встречает непустую папку.
 * @param {string} startPath - откуда начинать очистку
 * @param {string} [stopAtPath] - не подниматься выше этой папки (обычно корень языка)
 */
function cleanupEmptyDirectories(startPath, stopAtPath) {
  if (!startPath || !fs.existsSync(startPath)) return;

  let current = startPath;

  while (current) {
    // Не выходим за пределы stopAtPath
    if (stopAtPath && current === stopAtPath) break;

    const parent = path.dirname(current);
    if (parent === current) break; // корень диска

    if (!isEmptyDirectory(current)) {
      break; // нашли непустую папку — останавливаемся
    }

    try {
      fs.rmSync(current, { recursive: true, force: true });
      console.log(`🧹 Удалена пустая папка: ${current}`);
      current = parent;
    } catch (err) {
      console.warn(`Не удалось удалить пустую папку ${current}:`, err.message);
      break;
    }
  }
}

/**
 * Надёжно определяет корень языка (docs/ru, docs/en и т.д.)
 * @param {string} sourcePath - путь к любому разделу
 * @returns {string} путь к корню языка
 */
function getLanguageRoot(sourcePath) {
  let current = path.dirname(sourcePath);

  while (current && current !== path.parse(current).root) {
    const basename = path.basename(current).toLowerCase();

    // Если дошли до папки "docs" — следующий уровень должен быть языком
    if (basename === "docs") {
      const nextDir = path.join(
        current,
        path.basename(path.dirname(sourcePath)),
      ); // пытаемся взять язык из пути
      if (fs.existsSync(nextDir) && isLanguageRoot(nextDir)) {
        return nextDir;
      }
      return current; // fallback — возвращаем docs, если язык не найден
    }

    // Проверяем, является ли текущая папка корнем языка
    if (isLanguageRoot(current) && !isDiplodocSection(current)) {
      return current;
    }

    current = path.dirname(current);
  }

  // Если ничего не нашли — ищем папку docs в пути
  const parts = sourcePath.split(path.sep);
  const docsIndex = parts.findIndex((p) => p.toLowerCase() === "docs");

  if (docsIndex !== -1 && docsIndex + 1 < parts.length) {
    const langFolder = path.join(...parts.slice(0, docsIndex + 2));
    if (fs.existsSync(langFolder)) {
      return langFolder;
    }
  }

  // Крайний fallback
  return path.dirname(sourcePath);
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
  readCurrentSection,
  readCurrentSectionIndex,
  readCurrentPureTitle,
  updateIndexMdAdvanced,
  updateIndexYamlAdvanced,
  updateTocYamlTitle,
  updateSectionMetadata,
  renameSectionFolderIfNeeded,
  cleanupEmptyDirectories,
  isEmptyDirectory,
  getLanguageRoot,
};
