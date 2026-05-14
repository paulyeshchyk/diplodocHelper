// src/commands/diplodoc-helper.section.Create.js
const vscode = require("vscode");
const { calculateNextIndex } = require("../core/indexer");
const {
  IndexMdFileCreate,
  IndexYamlFileCreate,
  TocYamlFileCreate,
  TocYamlEntryPatchItems,
  createSectionFolder,
  TEMPLATE_SECTION_NAME,
} = require("../utils"); // используем barrel

const { FrontMatterSectionTypesIndexed } = require("../utils");

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

  const sectionName = TEMPLATE_SECTION_NAME(
    sectionType,
    userSectionName,
    sectionIndex,
  );

  try {
    IndexMdFileCreate(
      folderResult.folderPath,
      userSectionName,
      sectionType.name,
      sectionType.value,
      sectionIndex,
    );

    IndexYamlFileCreate(
      folderResult.folderPath,
      sectionName,
      sectionType.name,
      sectionType.value,
      sectionIndex,
    );

    TocYamlFileCreate(
      folderResult.folderPath,
      sectionName,
      sectionType.value,
      sectionIndex,
    );

    TocYamlEntryPatchItems(
      targetDir,
      sectionName,
      folderResult.folderName,
      sectionType.name,
      sectionIndex,
    );

    vscode.window.showInformationMessage(
      `Раздел "${sectionName}" (${sectionType.label}) создан!`,
    );
  } catch (err) {
    let msg = err instanceof Error ? err.message : "${err}";
    vscode.window.showErrorMessage(`Критическая ошибка: ${msg}`);
  }
}

module.exports = { createSection };
