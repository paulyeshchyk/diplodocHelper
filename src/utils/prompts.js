// src/utils/prompts.js
const vscode = require("vscode");
const { isValidName } = require("./files");
const { sectionTypes } = require("./section");

/**
 * @typedef {Object} PromptResult
 * @property {import('./diplodocTypes').SectionTypeOption} newSectionType
 * @property {string} newPureTitle
 * @property {string | undefined} userIndex
 */

/**
 * Полный диалог переименования/создания раздела
 * @param {string} currentName
 * @param {string} currentIndex
 * @returns {Promise<PromptResult | null>}
 */
async function promptSection(currentName, currentIndex) {
  const newSectionType = await promptSectionType();
  if (!newSectionType) return null;

  const newPureTitle = await promptSectionName(currentName);
  if (!newPureTitle) return null;

  // const hasIndex = FrontMatterSectionTypesIndexed.includes(newSectionType.name);
  // const userIndex = hasIndex
  //   ? await promptSectionIndex(currentIndex)
  //   : "";

  const userIndex = await promptSectionIndex(currentIndex);
  return { newSectionType, newPureTitle, userIndex };
}

/**
 * Выбор типа раздела
 * @returns {Promise<import('./diplodocTypes').SectionTypeOption | undefined>}
 */
async function promptSectionType() {
  const types = sectionTypes();
  return await vscode.window.showQuickPick(types, {
    placeHolder: "Выберите тип раздела",
    canPickMany: false,
  });
}

/**
 * Ввод названия раздела
 * @returns {Promise<string | undefined>}
 * @param {string | undefined} [currentTitle]
 */
async function promptSectionName(currentTitle) {
  return await vscode.window.showInputBox({
    value: (currentTitle || ""),
    prompt: "Введите название раздела",
    placeHolder: "Например: Справочник Номенклатуры",
    validateInput: (value) =>
      value && value.trim().length > 0 && value.length <= 255
        ? null
        : "Название не может быть пустым или слишком длинным",
  });
}

/**
 * Ввод индекса раздела
 * @param {string} currentIndex
 * @returns {Promise<string | undefined>}
 */
async function promptSectionIndex(currentIndex) {
  return await vscode.window.showInputBox({
    prompt: "Укажите индекс раздела (или оставьте пустым)",
    placeHolder: "Например: 1, 2.3 ...",
    value: currentIndex || "",
    validateInput: (value) => {
      if (!value || value.trim() === "") return null;
      return /^\d+(\.\d+)*$/.test(value) ? null : "Индекс должен быть числом или пустым";
    },
  });
}

/**
 * Простой селектор имени (для создания)
 */
async function ShowSectionNameSelector() {
  return await vscode.window.showInputBox({
    prompt: "Введите название подраздела",
    placeHolder: "Например: Справочник Номенклатуры",
    validateInput: (value) => (isValidName(value) ? null : "Некорректное имя"),
  });
}

/**
 * Простой селектор типа (для создания)
 */
async function ShowSectionTypeSelector() {
  const types = sectionTypes();
  return await vscode.window.showQuickPick(types, {
    placeHolder: "Выберите тип создаваемого раздела",
    canPickMany: false,
  });
}

module.exports = {
  promptSection,
  promptSectionType,
  promptSectionName,
  promptSectionIndex,
  ShowSectionNameSelector,
  ShowSectionTypeSelector,
};