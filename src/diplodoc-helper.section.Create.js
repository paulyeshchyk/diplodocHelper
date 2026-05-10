// diplodoc-helper.createSection.js
const vscode = require("vscode");

const { calculateNextIndex } = require("./diplodoc-helper.indexer");
const {
  createIndexMd,
  createIndexYaml,
  createTocYaml,
  patchParentToc,
  createSectionFolder,
} = require("./diplodoc-helper.utils.files");

const {
  ShowSectionNameSelector,
  ShowSectionTypeSelector,
} = require("./diplodoc-helper.utils.prompts");

const {
  isDiplodocSection,
  isLanguageRoot,
} = require("./diplodoc-helper.utils.files");

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
  if (!sectionType) 
    return;

  // 2. Диалог ввода имени
  const sectionName = await ShowSectionNameSelector();
  if (!sectionName) 
    return;

  const sectionIndex = calculateNextIndex(targetDir);

  const folderResult = createSectionFolder(targetDir, sectionType, sectionName, sectionIndex);
  if (!folderResult) 
    return; // выход при ошибке или невозможности создать папку

  try {

    createIndexMd(
      folderResult.folderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
      sectionIndex,
    );

    createIndexYaml(
      folderResult.folderPath,
      sectionName,
      sectionType.name,
      sectionType.label,
      sectionIndex,
    );

    createTocYaml(folderResult.folderPath, sectionName, sectionType.label, sectionIndex);

    patchParentToc(
      targetDir,
      sectionName,
      sectionType.label,
      folderResult.folderName,
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

module.exports = { createSection };
