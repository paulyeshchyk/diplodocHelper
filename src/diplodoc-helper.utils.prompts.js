// diplodoc-helper.prompts.js

const vscode = require("vscode");
const { 
    isValidName 
} = require("./diplodoc-helper.utils.files");
const { 
    sectionTypes 
} = require("./diplodoc-helper.utils.section");

/** @import { SectionTypeOption } from './diplodoc-helper.utils.section.js' */

// ----------------------------------------------------------------------
// Диалоги с пользователем
// ----------------------------------------------------------------------



/**
 * @typedef {Object} PromptResult
 * @property {SectionTypeOption} newSectionType
 * @property {string} newPureTitle
 * @property {string | undefined} userIndex
 */

/**
 * @param {string} currentIndex
 * @returns {Promise<PromptResult | null>}
 */
async function promptSection(currentIndex) {
  const newSectionType = await promptSectionType();
  if (!newSectionType) return null;

  const newPureTitle = await promptSectionName();
  if (!newPureTitle) return null;

  const userIndex = await promptSectionIndex(currentIndex);

  return {
    newSectionType: newSectionType,
    newPureTitle: newPureTitle,
    userIndex: userIndex,
  };
}

/**
 * Запрашивает у пользователя выбор типа раздела.
 * @returns {Promise<SectionTypeOption | undefined>}
 */
async function promptSectionType() {
  const types = sectionTypes();
  const selected = await vscode.window.showQuickPick(types, {
    placeHolder: "Выберите новый тип рубрики",
    canPickMany: false,
  });
  return selected;
}

async function promptSectionName() {
  return await vscode.window.showInputBox({
    prompt: "Введите новое название раздела",
    placeHolder: "Например: Справочник Номенклатуры",
    validateInput: (value) =>
      value && value.trim().length > 0 && value.length <= 255
        ? null
        : "Некорректное имя или слишком длинное",
  });
}


/**
 * @param {string} currentIndex
 */
async function promptSectionIndex(currentIndex) {
    const defaultValue = currentIndex || "";
    const result = await vscode.window.showInputBox({
        prompt: "Укажите порядковый номер (индекс) раздела. Если индекс не нужен, оставьте поле пустым.",
        placeHolder: "Например: 1, 2, 3 ... или пусто",
        value: defaultValue,
        validateInput: (value) => {
            if (value === "") return null;
            if (/^\d+$/.test(value)) return null;
            return "Индекс должен быть целым положительным числом или пустым";
        },
    });
    return result; // undefined – отмена, string (может быть пустой)
}


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


module.exports = { 
    promptSection,
    promptSectionIndex,
    promptSectionName,
    promptSectionType,
    ShowSectionNameSelector,
    ShowSectionTypeSelector
};
