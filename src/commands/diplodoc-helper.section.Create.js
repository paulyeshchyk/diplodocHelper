// src/commands/diplodoc-helper.section.Create.js
const vscode = require("vscode");
const { calculateNextIndex } = require("../core/indexer");
const {
  createIndexMd,
  createIndexYaml,
  createTocYaml,
  patchParentToc,
  createSectionFolder,
} = require("../utils"); // ← используем barrel

const {
  ShowSectionNameSelector,
  ShowSectionTypeSelector,
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

  const sectionName = await ShowSectionNameSelector();
  if (!sectionName) return;

  const sectionIndex = calculateNextIndex(targetDir);

  const folderResult = createSectionFolder(targetDir, sectionType, sectionName, sectionIndex);
  if (!folderResult) return;

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