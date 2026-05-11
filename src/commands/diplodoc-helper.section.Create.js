// src/commands/diplodoc-helper.section.Create.js
const vscode = require("vscode");
const { calculateNextIndex } = require("../core/indexer");
const {
  createIndexMd,
  createIndexYaml,
  createTocYaml,
  patchParentToc,
  createSectionFolder,
  TEMPLATE_SECTION_NAME,
} = require("../utils"); // используем barrel

const {
  ShowSectionNameSelector,
  ShowSectionTypeSelector,
  promptSectionIndex
} = require("../utils");

const {
  isDiplodocSection,
  isLanguageRoot,
} = require("../utils");

/**
 * @param {{ fsPath: any; }} uri
 */
async function createSection(uri) {
  if (!uri) return;
  const targetDir = uri.fsPath;

  if (!isDiplodocSection(targetDir) && !isLanguageRoot(targetDir)) {
    vscode.window.showErrorMessage(
      "Раздел можно создать только внутри другого раздела или в корне папки языка."
    );
    return;
  }

  const sectionType = await ShowSectionTypeSelector();
  if (!sectionType) return;

  const userSectionName = await ShowSectionNameSelector();
  if (!userSectionName) return;

  const sectionIndexCalculated = calculateNextIndex(targetDir);
  const sectionIndex = await promptSectionIndex(sectionIndexCalculated);

  const folderResult = createSectionFolder(targetDir, sectionType, userSectionName, sectionIndex);
  if (!folderResult) return;

  const sectionName = TEMPLATE_SECTION_NAME(sectionType, userSectionName, sectionIndex);

  try {
    createIndexMd(
      folderResult.folderPath,
      userSectionName,
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
      folderResult.folderName,
      sectionType.name,
      sectionIndex
    );

    vscode.window.showInformationMessage(
      `Раздел "${sectionName}" (${sectionType.label}) создан!`
    );
  } catch (err) {
    var msg = (err instanceof Error) ? err.message : "unknown";
    vscode.window.showErrorMessage(`Критическая ошибка: ${msg}`);
  }
}

module.exports = { createSection };