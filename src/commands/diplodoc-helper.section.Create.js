// src/commands/diplodoc-helper.section.Create.js
const vscode = require("vscode");
const { calculateNextIndex } = require("../core/indexer");
const {
  IndexMdFileCreate,
  IndexYamlFileCreate,
  TocYamlFileCreate,
  TocYamlEntryPatchItems,
  createSectionFolder,
} = require("../utils"); // используем barrel

const { FrontMatterSectionTypesIndexed } = require("../utils/constants");
const { composeFullTitle } = require("../utils/sectionTitle")

const {
  ShowSectionNameSelector,
  ShowSectionTypeSelector,
  promptSectionIndex,
} = require("../utils");

const { isDiplodocSection, isLanguageRoot } = require("../utils");

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

  const sectionType = await ShowSectionTypeSelector();
  if (!sectionType) return;

  const userSectionName = await ShowSectionNameSelector();
  if (!userSectionName) return;

  const hasIndex = FrontMatterSectionTypesIndexed.includes(sectionType.name);

  const sectionIndexCalculated = calculateNextIndex(targetDir);

  const sectionIndex = hasIndex
    ? await promptSectionIndex(sectionIndexCalculated)
    : "";

  /** @import {CreateFolderResult} from '../utils/directory' */

  /** @type {CreateFolderResult?} */
  const folderResult = createSectionFolder(
    targetDir,
    sectionType,
    userSectionName,
    sectionIndex,
  );
  if (!folderResult) return;

  const fullTitle = composeFullTitle(sectionIndex, sectionType, userSectionName);

  try {
    IndexMdFileCreate(
      folderResult.folderPath,
      fullTitle,
      sectionType.name,
      sectionType.value,
      sectionIndex,
    );

    IndexYamlFileCreate(
      folderResult.folderPath,
      fullTitle,
      sectionType.name,
      sectionType.value,
      sectionIndex,
    );

    TocYamlFileCreate(
      folderResult.folderPath,
      fullTitle,
      sectionType.value,
      sectionIndex,
    );

    TocYamlEntryPatchItems(
      targetDir,
      fullTitle,
      sectionType.value,
      folderResult.folderName,
      sectionIndex,
    );

    vscode.window.showInformationMessage(
      `Раздел "${fullTitle}" (${sectionType.label}) создан!`,
    );
  } catch (err) {
    let msg = err instanceof Error ? err.message : "${err}";
    vscode.window.showErrorMessage(`Критическая ошибка: ${msg}`);
  }
}

module.exports = { createSection };


