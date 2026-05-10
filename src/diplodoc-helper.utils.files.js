//diplodoc-helper.utils.js

const fs = require("fs");
const vscode = require("vscode");
const path = require("path");
const yaml = require("js-yaml");

const {
  FrontMatterMeta,
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

/**
 * Читает файл с YAML frontmatter.
 * @param {string} filePath
 * @returns {{ frontmatter: Record<string, any>, body: string, raw: string } | null}
 */
function readFileWithFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  if (!match) return null;
  try {
    const frontmatter = yaml.load(match[1]);
    return { frontmatter: frontmatter || {}, body: match[2], raw: content };
  } catch (err) {
    console.warn(`Ошибка парсинга YAML в ${filePath}:`, err);
    return null;
  }
}

/**
 * Записывает файл с YAML frontmatter.
 * @param {string} filePath
 * @param {Record<string, any>} frontmatterObj
 * @param {string} body
 */
function writeFileWithFrontmatter(filePath, frontmatterObj, body) {
  const cleanObj = Object.fromEntries(
    Object.entries(frontmatterObj).filter(([, v]) => v !== undefined && v !== null)
  );
  const yamlStr = yaml.dump(cleanObj, { lineWidth: 120, noRefs: true });
  const newContent = `---\n${yamlStr}---\n${body}`;
  fs.writeFileSync(filePath, newContent, "utf8");
}

/**
 * Возвращает текущий sectionIndex раздела.
 * @param {string} folderPath
 * @returns {string}
 */
function readCurrentSectionIndex(folderPath) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return "";
  const data = readFileWithFrontmatter(indexPath);
  if (data && data.frontmatter[FrontMatterMeta.SECTIONINDEX] !== undefined) {
    return String(data.frontmatter[FrontMatterMeta.SECTIONINDEX]);
  }
  return "";
}

/**
 * Обновляет index.md раздела новыми метаданными.
 * @param {string} folderPath
 * @param {string} pureTitle
 * @param {string} sectionTypeName
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function updateIndexMdAdvanced(
  folderPath,
  pureTitle,
  sectionTypeName,
  sectionLabel,
  sectionIndex
) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return;
  const data = readFileWithFrontmatter(indexPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${indexPath}`);
    return;
  }
  const fm = data.frontmatter;
  let composedTitle = sectionIndex && sectionIndex.trim() !== ""
    ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
    : pureTitle;
  fm[FrontMatterMeta.TITLE] = composedTitle;
  fm[FrontMatterMeta.PURETITLE] = pureTitle;
  fm[FrontMatterMeta.SECTIONTYPE] = sectionTypeName;
  if (sectionIndex && sectionIndex.trim() !== "") {
    fm[FrontMatterMeta.SECTIONINDEX] = sectionIndex;
  } else {
    delete fm[FrontMatterMeta.SECTIONINDEX];
  }
  writeFileWithFrontmatter(indexPath, fm, data.body);
}

/**
 * Обновляет index.yaml раздела новыми метаданными.
 * @param {string} folderPath
 * @param {string} pureTitle
 * @param {string} sectionTypeName
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function updateIndexYamlAdvanced(
  folderPath,
  pureTitle,
  sectionTypeName,
  sectionLabel,
  sectionIndex
) {
  const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(yamlPath)) return;
  const data = readFileWithFrontmatter(yamlPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${yamlPath}`);
    return;
  }
  const fm = data.frontmatter;
  let composedTitle = sectionIndex && sectionIndex.trim() !== ""
    ? `${sectionLabel} ${sectionIndex}. ${pureTitle}`
    : pureTitle;
  fm[FrontMatterMeta.TITLE] = composedTitle;
  fm[FrontMatterMeta.PURETITLE] = pureTitle;
  fm[FrontMatterMeta.SECTIONTYPE] = sectionTypeName;
  if (sectionIndex && sectionIndex.trim() !== "") {
    fm[FrontMatterMeta.SECTIONINDEX] = sectionIndex;
  } else {
    delete fm[FrontMatterMeta.SECTIONINDEX];
  }
  writeFileWithFrontmatter(yamlPath, fm, data.body);
}

/**
 * Обновляет свой заголовок в toc.yaml раздела (первый элемент items).
 * @param {string} folderPath
 * @param {string} composedTitle
 */
function updateTocYamlTitle(folderPath, composedTitle) {
  const tocPath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;
  let content = fs.readFileSync(tocPath, "utf8");
  const firstItemRegex = /(items:\s*\n\s*-\s+name:\s*)([^\n]+)/;
  const match = content.match(firstItemRegex);
  if (match) {
    const originalIndent = match[1];
    const newLine = `${originalIndent}${composedTitle}`;
    content = content.replace(firstItemRegex, newLine);
    fs.writeFileSync(tocPath, content, "utf8");
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
  createSectionFolder,
  readFileWithFrontmatter,
  writeFileWithFrontmatter,
  readCurrentSectionIndex,
  updateIndexMdAdvanced,
  updateIndexYamlAdvanced,
  updateTocYamlTitle,
};
