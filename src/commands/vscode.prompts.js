// src/utils/prompts.js
const vscode = require('vscode');
const { isValidName } = require('../plugins/shared/validators/diplodocDirectoryValidator');
const { sectionTypes } = require('../plugins/model/section.model');
const { FrontMatterSectionTypesIndexed2 } = require('../plugins/model/frontmatter.model');

/**
 * @typedef {Object} PromptResult
 * @property {import('../plugins/model/section.model').SectionTypeOption} newSectionType
 * @property {string} newPureTitle
 * @property {string | undefined} userIndex
 */

/**
 * Полный диалог переименования раздела
 * @param {string} [currentPureTitle] - текущее чистое название (для предзаполнения)
 * @param {string} [currentIndex] - текущий индекс
 * @returns {Promise<PromptResult | null>}
 */
async function promptSection(currentPureTitle = '', currentIndex = '') {
    const newSectionType = await promptSectionType();
    if (!newSectionType) return null;

    const newPureTitle = await promptSectionName(currentPureTitle);
    if (!newPureTitle) return null;

    const isIndexed = FrontMatterSectionTypesIndexed2.includes(newSectionType.name);
    let userIndex = '';
    if (isIndexed) {
        userIndex = (await promptSectionIndex(currentIndex)) ?? '';
    }

    return { newSectionType, newPureTitle, userIndex };
}

/**
 * Выбор типа раздела
 * @returns {Promise<import('../plugins/model/section.model').SectionTypeOption | undefined>}
 */
async function promptSectionType() {
    const types = sectionTypes();
    return await vscode.window.showQuickPick(types, {
        placeHolder: 'Выберите тип раздела',
        canPickMany: false,
    });
}

/**
 * Ввод названия раздела с предзаполнением
 * @param {string} [currentValue]
 * @returns {Promise<string | undefined>}
 */
async function promptSectionName(currentValue = '') {
    return await vscode.window.showInputBox({
        prompt: 'Введите новое название раздела',
        value: currentValue,
        placeHolder: 'Например: Справочник Номенклатуры',
        validateInput: value =>
            value && value.trim().length > 0 && value.length <= 255
                ? null
                : 'Название не может быть пустым или слишком длинным',
    });
}

/**
 * Ввод индекса раздела
 * @param {string} currentIndex
 * @returns {Promise<string | undefined>}
 */
/**
 * Валидация индекса
 * Разрешаем: 0, 1, 2.5, 7.3, 10.15 и т.д.
 * Запрещаем: -1, .5, 1., пустые строки с точками
 */
async function promptSectionIndex(currentIndex = '') {
    return await vscode.window.showInputBox({
        prompt: 'Укажите индекс раздела (можно с дробной частью, например 7.5)',
        value: currentIndex,
        placeHolder: 'Например: 0.5, 1, 2.3, 7.5 ...',
        validateInput: value => {
            if (!value || value.trim() === '') return null; // пустой — разрешён

            // Разрешаем только цифры и точки, но не начинаем и не заканчиваем на точку
            if (!/^\d+(\.\d+)*$/.test(value)) {
                return 'Индекс должен состоять из цифр и точек (например: 0.5, 1, 7.3)';
            }

            // Дополнительно: запрещаем несколько точек подряд и ведущие нули в частях кроме 0
            if (/\.\./.test(value) || value.split('.').some(part => part.length > 1 && part.startsWith('0'))) {
                return 'Некорректный формат индекса';
            }

            return null;
        },
    });
}

/**
 * Простой селектор имени (для создания)
 */
async function ShowSectionNameSelector() {
    return await vscode.window.showInputBox({
        prompt: 'Введите название подраздела',
        placeHolder: 'Например: Справочник Номенклатуры',
        validateInput: value => (isValidName(value) ? null : 'Некорректное имя'),
    });
}

/**
 * Простой селектор типа (для создания)
 */
async function ShowSectionTypeSelector() {
    const types = sectionTypes();
    return await vscode.window.showQuickPick(types, {
        placeHolder: 'Выберите тип создаваемого раздела',
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
