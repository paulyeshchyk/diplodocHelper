const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

/** @import { TocItem, TocDocument } from './diplodoc-helper.utils.types.js' */

const { format } = require("./diplodoc-helper.utils.files.js");
const { promptSection } = require("./diplodoc-helper.utils.prompts.js");
const { indentedTocEntry } = require("./diplodoc-helper.utils.toc.js");

const {
  FrontMatterMeta,
  FrontMatterFiles,
} = require("./diplodoc-helper.utils.constants.js");

const { isDiplodocSection } = require("./diplodoc-helper.utils.files.js");

// ----------------------------------------------------------------------
// Генерация имени папки
// ----------------------------------------------------------------------
/**
 * @param {{ label: any; name?: string; description?: string; }} sectionType
 * @param {string} sectionName
 */
function generateFolderName(sectionType, sectionName) {
  const sanitized = sectionName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
  return `${sectionType.label}.${sanitized}`;
}

// ----------------------------------------------------------------------
// Работа с YAML frontmatter
// ----------------------------------------------------------------------
/**
 * @param {string } filePath
 * @returns {{ frontmatter: Record<string, any>, body: string, raw: string } | null}
 */
function readFileWithFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  if (!match) return null;

  try {
    const frontmatter = /** @type {TocDocument} */ (yaml.load(match[1]));
    return { frontmatter: frontmatter || {}, body: match[2], raw: content };
  } catch (err) {
    console.warn(`Ошибка парсинга YAML в ${filePath}:`, err);
    return null;
  }
}

/**
 * @param {fs.PathOrFileDescriptor} filePath
 * @param {{ [s: string]: any; } | ArrayLike<any>} frontmatterObj
 * @param {string} body
 */
function writeFileWithFrontmatter(filePath, frontmatterObj, body) {
  const cleanObj = Object.fromEntries(
    Object.entries(frontmatterObj).filter(
      ([, v]) => v !== undefined && v !== null,
    ),
  );
  const yamlStr = yaml.dump(cleanObj, { lineWidth: 120, noRefs: true });
  const newContent = `---\n${yamlStr}---\n${body}`;
  fs.writeFileSync(filePath, newContent, "utf8");
}

// ----------------------------------------------------------------------
// Обновление index.md и index.yaml переименованного раздела
// ----------------------------------------------------------------------
/**
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
  sectionIndex,
) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return;

  const data = readFileWithFrontmatter(indexPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${indexPath}`);
    return;
  }

  const fm = data.frontmatter;
  let composedTitle;
  if (sectionIndex && sectionIndex.trim() !== "") {
    composedTitle = `${sectionLabel} ${sectionIndex}. ${pureTitle}`;
  } else {
    composedTitle = pureTitle;
  }

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
  sectionIndex,
) {
  const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(yamlPath)) return;

  const data = readFileWithFrontmatter(yamlPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${yamlPath}`);
    return;
  }

  const fm = data.frontmatter;
  let composedTitle;
  if (sectionIndex && sectionIndex.trim() !== "") {
    composedTitle = `${sectionLabel} ${sectionIndex}. ${pureTitle}`;
  } else {
    composedTitle = pureTitle;
  }

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

// ----------------------------------------------------------------------
// Обновление собственного toc.yaml (только первого name)
// ----------------------------------------------------------------------
/**
 * @param {string} folderPath
 * @param {string} composedTitle
 */
function updateTocYaml(folderPath, composedTitle) {
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

// ----------------------------------------------------------------------
// Работа с родительским toc.yaml
// ----------------------------------------------------------------------
/**
 * @param {string} str
 */
function normalizeEmptyLines(str) {
  return str.replace(/\n\s*\n\s*\n/g, "\n\n");
}

/**
 * @param {string} parentDir
 * @param {string} folderName
 */
function removeFromParentToc(parentDir, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const sectionRegex = new RegExp(
    `\\s*-\\s+name:.*\\r?\\n\\s+href:\\s+${folderName}/index\\.md(?:\\r?\\n\\s+include:\\r?\\n\\s+path:\\s+${folderName}/toc\\.yaml\\r?\\n\\s+mode:\\s+link)?`,
    "g",
  );
  let newContent = content.replace(sectionRegex, "");
  newContent = normalizeEmptyLines(newContent);
  newContent = newContent.trimEnd() + "\n";
  fs.writeFileSync(tocPath, newContent, "utf8");
}

/**
 * @param {string} parentDir
 */
function getIndentationFromParentToc(parentDir) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return "  ";
  const content = fs.readFileSync(tocPath, "utf8");
  const match = content.match(/^(\s*)-\s+name:/m);
  return match ? match[1] : "  ";
}

/**
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} newFolderName
 */
function addToParentToc(parentDir, composedTitle, newFolderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, "utf8");
  const indent = getIndentationFromParentToc(parentDir);
  const newEntry = indentedTocEntry(indent, composedTitle, newFolderName);

  if (!content.includes("items:")) {
    content = content.trimEnd() + "\nitems:\n" + newEntry;
  } else {
    content = content.trimEnd() + "\n" + newEntry;
  }
  content = normalizeEmptyLines(content);
  fs.writeFileSync(tocPath, content, "utf8");
}

// ----------------------------------------------------------------------
// Обновление родительского index.yaml
// ----------------------------------------------------------------------
/**
 * @param {string} parentDir
 * @param {string} oldFolderName
 * @param {string} newFolderName
 * @param {string} composedTitle
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
  let changed = false;

  const hrefRegex = new RegExp(`(href:\\s*)${oldFolderName}/`, "g");
  const newContentHref = content.replace(hrefRegex, `$1${newFolderName}/`);
  if (newContentHref !== content) {
    content = newContentHref;
    changed = true;
  }

  const oldSelfHref = `${oldFolderName}/index.md`;
  const newSelfHref = `${newFolderName}/index.md`;
  const selfEntryRegex = new RegExp(
    `(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldSelfHref}`,
    "g",
  );
  const newContentSelf = content.replace(
    selfEntryRegex,
    `$1${composedTitle}$3${newSelfHref}`,
  );
  if (newContentSelf !== content) {
    content = newContentSelf;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(indexPath, content, "utf8");
  }
}

// ----------------------------------------------------------------------
// Чтение текущего sectionIndex
// ----------------------------------------------------------------------
/**
 * @param {string} folderPath
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

// ----------------------------------------------------------------------
// ОСНОВНАЯ ФУНКЦИЯ
// ----------------------------------------------------------------------
/**
 * @param {{ fsPath: any; }} uri
 */
async function renameSection(uri) {
  if (!uri) return;

  const oldFolderPath = uri.fsPath;
  const oldFolderName = path.basename(oldFolderPath);
  const parentDir = path.dirname(oldFolderPath);

  if (!isDiplodocSection(oldFolderPath)) {
    vscode.window.showErrorMessage(
      "Переименовать можно только полноценный раздел (содержит index.md, index.yaml, toc.yaml).",
    );
    return;
  }

  const currentIndex = readCurrentSectionIndex(oldFolderPath);

  var newSectionObject = await promptSection(currentIndex);
  if (!newSectionObject) return;

  const finalIndex = newSectionObject.userIndex || "";

  const newFolderName = generateFolderName(
    newSectionObject.newSectionType,
    newSectionObject.newPureTitle,
  );
  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath)) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
    return;
  }
  try {
    fs.accessSync(parentDir, fs.constants.W_OK);
  } catch {
    vscode.window.showErrorMessage(
      `Нет прав на запись в родительскую директорию ${parentDir}`,
    );
    return;
  }

  let composedTitle;
  if (finalIndex !== "") {
    composedTitle = `${newSectionObject.newSectionType.label} ${finalIndex}. ${newSectionObject.newPureTitle}`;
  } else {
    composedTitle = newSectionObject.newPureTitle;
  }

  removeFromParentToc(parentDir, oldFolderName);
  updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle);

  try {
    fs.renameSync(oldFolderPath, newFolderPath);
  } catch (err) {
    addToParentToc(parentDir, composedTitle, oldFolderName);
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(
      `Не удалось переименовать папку: ${message}`,
    );
    return;
  }

  try {
    updateIndexMdAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex,
    );
    updateIndexYamlAdvanced(
      newFolderPath,
      newSectionObject.newPureTitle,
      newSectionObject.newSectionType.name,
      newSectionObject.newSectionType.label,
      finalIndex,
    );
    updateTocYaml(newFolderPath, composedTitle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(
      `Раздел переименован, но не удалось обновить содержимое файлов: ${message}`,
    );
  }

  addToParentToc(parentDir, composedTitle, newFolderName);

  const indexValue = finalIndex ? `, индекс: ${finalIndex}` : "";
  vscode.window.showInformationMessage(
      successMessage(oldFolderName, newFolderName, newSectionObject.newSectionType.label, indexValue),
  );
}

module.exports = { renameSection };

/**
 * @param {string} oldFolderName
 * @param {string} newFolderName
 * @param {string} label
 * @param {string} indexValue
 */
function successMessage(oldFolderName, newFolderName, label, indexValue) {
    return `Раздел "${oldFolderName}" переименован в "${newFolderName}" (тип: ${label}${indexValue})`;
}

