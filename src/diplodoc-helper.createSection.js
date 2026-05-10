// diplodoc-helper.createSection.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { calculateNextIndex } = require("./diplodoc-helper.indexer");
const { sectionTypes } = require("./diplodoc-helper.section.utils");
const { FrontMatterFiles } = require("./diplodoc-helper.constants");

const {
  TEMPLATE_INDEX_MD,
  TEMPLATE_INDEX_YAML,
  TEMPLATE_TOC_YAML,
  TEMPLATE_PARENT_TOC_YAML,
} = require("./diplodoc-helper.templates");


// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async function ShowSectionNameSelector() {
  return await vscode.window.showInputBox({
    prompt: "Введите название подраздела",
    placeHolder: "Например: Справочник Номенклатуры",
    validateInput: (value) =>
      isValidName(value) ? null : "Некорректное имя или слишком длинное",
  });
}

async function ShowSectionTypeSelector() {
  const localSectionTypes = sectionTypes();

  const sectionType = await vscode.window.showQuickPick(localSectionTypes, {
    placeHolder: "Выберите тип создаваемого раздела",
    canPickMany: false,
  });
  return sectionType;
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
 * @param {{ label: any; name?: string; description?: string; }} sectionType
 * @param {string} sectionName
 */
function TEMPLATE_FOLDER_NAME(sectionType, sectionName) {
  return [
    sectionType.label,
    sectionName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, ""),
  ].join(".");
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
    console.warn(`Родительский ${FrontMatterFiles.TOC_YAML} не найден в ${parentDir}`);
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

const {
  isDiplodocSection,
  isLanguageRoot,
} = require("./diplodoc-helper.utils");

// --- ОСНОВНАЯ ФУНКЦИЯ (экспортируемый обработчик) ---
/**
 * @param {{ fsPath: any; }} uri
 */
async function createSection(uri) {
  if (!uri) return;
  const targetDir = uri.fsPath;

  if (!isDiplodocSection(targetDir) && !isLanguageRoot(targetDir)) {
    vscode.window.showErrorMessage(
      "Раздел можно создать только внутри другого раздела или в корне папки языка.",
    );
    return;
  }

  // 1. Диалог выбора типа (Выпадающий список)
  const sectionType = await ShowSectionTypeSelector();
  if (!sectionType) return;

  // 2. Диалог ввода имени
  const sectionName = await ShowSectionNameSelector();
  if (!sectionName) return;

  const sectionIndex = calculateNextIndex(targetDir);

  const folderName = TEMPLATE_FOLDER_NAME(
    sectionType,
    sectionName
  );

  const newFolderPath = path.join(targetDir, folderName);

  if (!canCreateFolder(newFolderPath)) return;

  try {
    fs.mkdirSync(newFolderPath, { recursive: true });

    createIndexMd(
      newFolderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
      sectionIndex,
    );

    createIndexYaml(
      newFolderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
      sectionIndex,
    );

    createTocYaml(newFolderPath, sectionName, sectionType.label, sectionIndex);

    patchParentToc(
      targetDir,
      sectionName,
      sectionType.label,
      folderName,
      sectionIndex,
    );

    vscode.window.showInformationMessage(
      `Раздел "${sectionName}" (${sectionType.label}) создан!`,
    );
  } catch (err) {
    if (err instanceof Error)
      vscode.window.showErrorMessage(`Критическая ошибка: ${err.message}`);
  }
}

module.exports = { createSection, sectionTypes };
