// diplodoc-helper.createSection.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// --- ШАБЛОНЫ (Константы) ---
const TEMPLATE_INDEX_MD = (
  /** @type {string} */ title,
  /** @type {string} */ sectionType,
  /** @type {string} */ sectionLabel,
) =>
  `---\ntitle: ${sectionLabel}.${title}\ntype: ${sectionType}\npureTitle: ${title}\n---\n`;

const TEMPLATE_INDEX_YAML = (
  /** @type {string} */ title,
  /** @type {string} */ sectionType,
  /** @type {string} */ sectionLabel,
) =>
  `title: ${sectionLabel}.${title}\ndescription: Описывает ${sectionLabel}.${title}\nmeta:\n  title: ${sectionLabel}.${title}\n  type: ${sectionType}\n  noIndex: true\n`;

const TEMPLATE_TOC_YAML = (
  /** @type {string} */ title,
  /** @type {string} */ sectionLabel,
) => `title: ${sectionLabel}.${title}\nhref: index.yaml\n`;

const TEMPLATE_PARENT_TOC_YAML = (
  /** @type {string} */ name,
  /** @type {string} */ sectionLabel,
  /** @type {string} */ folderName,
) =>
  `  - name: ${sectionLabel}.${name}\n    href: ${folderName}/index.md\n    include:\n      path: ${folderName}/toc.yaml\n      mode: link\n`;

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
  const sectionTypes = [
    {
      label: "Часть",
      name: "Part",
      description:
        "Структурная единица руководства, представляющая собой наиболее крупную ступень его деления",
    },
    {
      label: "Раздел",
      name: "Section",
      description:
        "Крупная рубрика, являющаяся одной из высших ступеней деления основного текста",
    },
    {
      label: "Глава",
      name: "Chapter",
      description: "Крупная рубрика, имеющая самостоятельный заголовок",
    },
    { label: "Статья", name: "Page", description: "" },
  ];

  const sectionType = await vscode.window.showQuickPick(sectionTypes, {
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
 */
function createIndexMd(folderPath, title, sectionType, sectionLabel) {
  const filePath = path.join(folderPath, "index.md");
  fs.writeFileSync(
    filePath,
    TEMPLATE_INDEX_MD(title, sectionType, sectionLabel),
    "utf8",
  );
}

/**
 * @param {string} folderPath
 * @param {string} title
 * @param {string} sectionType
 * @param {string} sectionLabel
 */
function createIndexYaml(folderPath, title, sectionType, sectionLabel) {
  const filePath = path.join(folderPath, "index.yaml");
  fs.writeFileSync(
    filePath,
    TEMPLATE_INDEX_YAML(title, sectionType, sectionLabel),
    "utf8",
  );
}

/**
 * @param {string} folderPath
 * @param {string} title
 * @param {string} sectionLabel
 */
function createTocYaml(folderPath, title, sectionLabel) {
  const filePath = path.join(folderPath, "toc.yaml");
  fs.writeFileSync(filePath, TEMPLATE_TOC_YAML(title, sectionLabel), "utf8");
}

/**
 * @param {string} parentDir
 * @param {string} sectionTitle
 * @param {string} folderName
 * @param {string} sectionType
 */
function patchParentToc(parentDir, sectionTitle, sectionType, folderName) {
  const tocPath = path.join(parentDir, "toc.yaml");
  if (!fs.existsSync(tocPath)) {
    console.warn(`Родительский toc.yaml не найден в ${parentDir}`);
    return;
  }
  let content = fs.readFileSync(tocPath, "utf8");
  const newItemEntry = TEMPLATE_PARENT_TOC_YAML(
    sectionTitle,
    sectionType,
    folderName,
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

  const folderName = TEMPLATE_FOLDER_NAME(sectionType, sectionName);

  const newFolderPath = path.join(targetDir, folderName);

  if (!canCreateFolder(newFolderPath)) return;

  try {
    fs.mkdirSync(newFolderPath, { recursive: true });

    createIndexMd(
      newFolderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
    );

    createIndexYaml(
      newFolderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
    );
    createTocYaml(newFolderPath, sectionName, sectionType.label);
    patchParentToc(targetDir, sectionName, sectionType.label, folderName);

    vscode.window.showInformationMessage(
      `Раздел "${sectionName}" (${sectionType.label}) создан!`,
    );
  } catch (err) {
    if (err instanceof Error)
      vscode.window.showErrorMessage(`Критическая ошибка: ${err.message}`);
  }
}

module.exports = { createSection };
