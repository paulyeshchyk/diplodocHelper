const vscode = require('vscode');
const path = require('path');

const { nls_ts, translate } = require('../nls_ts.js');
const {
    diplodocFrontmatterParseContexts,
    diplodocFrontmatterReadContexts,
    diplodocFrontmatterUpdateContext,
} = require('../plugins/shared/services/frontmatter/diplodoc.frontmatter.service.context.js');

/**
 * Запрашивает ввод нового контекста.
 * @param {string} prompt - текст приглашения
 * @param {string} [placeholder] - плейсхолдер
 * @param {string} [initialValue] - начальное значение (для редактирования)
 * @returns {Promise<string | undefined>} – введённая строка или undefined при отмене
 */
async function askForContextInput(prompt, placeholder, initialValue = '') {
    const result = await vscode.window.showInputBox({
        prompt,
        value: initialValue,
        validateInput: v =>
            diplodocFrontmatterParseContexts(v).length === 0
                ? translate(nls_ts.plugin.context.update.change.error.validation)
                : null,
    });
    return result;
}

/**
 * Показывает выбор действия (добавить или редактировать).
 * @param {string[]} currentContexts - существующие контексты
 * @returns {Promise<{ action: 'add' } | { action: 'edit', value: string } | undefined>}
 */
async function askForAction(currentContexts) {
    const options = [
        {
            label: translate(nls_ts.plugin.context.update.new.addnewcontext),
            action: 'add',
            value: '',
        },
        ...currentContexts.map(ctx => ({
            label: ctx,
            action: 'edit',
            value: ctx,
        })),
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: translate(nls_ts.plugin.context.update.new.actionplaceholder),
    });

    if (!selected) return undefined;

    if (selected.action === 'add') {
        return { action: 'add' };
    } else {
        return { action: 'edit', value: selected.value };
    }
}

/**
 * Собирает пользовательский ввод в зависимости от ситуации.
 * @param {string} sectionPath
 * @returns {Promise<UpdateContextResult>}
 */
async function collectUserInput(sectionPath) {
    const indexMdPath = path.join(sectionPath, 'index.md');
    const currentContexts = diplodocFrontmatterReadContexts(indexMdPath);

    // Случай 1: контекстов нет → создаём первый
    if (currentContexts.length === 0) {
        const input = await askForContextInput(
            translate(nls_ts.plugin.context.update.new.prompt),
            translate(nls_ts.plugin.context.update.new.placeholder)
        );
        if (!input) return { cancelled: true };
        return { action: 'createFirst', newContext: input };
    }

    // Случай 2: есть контексты → выбираем действие
    const action = await askForAction(currentContexts);
    if (!action) return { cancelled: true };

    if (action.action === 'add') {
        const input = await askForContextInput(
            translate(nls_ts.plugin.context.update.new.add.inputprompt),
            translate(nls_ts.plugin.context.update.new.add.inputplaceholder)
        );
        if (!input) return { cancelled: true };
        return { action: 'add', newContext: input };
    }

    // Редактирование
    const oldValue = action.value;
    const newInput = await askForContextInput(
        translate(nls_ts.plugin.context.update.change.inputprompt, oldValue),
        undefined,
        oldValue
    );
    if (newInput === undefined) return { cancelled: true };
    return { action: 'edit', oldValue, newContext: newInput };
}

// ========== Утилиты для уведомлений ==========

/**
 * Показывает сообщение об успехе.
 * @param {string} [finalString]
 */
function notifySuccess(finalString) {
    vscode.window.showInformationMessage(translate(nls_ts.plugin.context.update.info.success, finalString || ''));
}

/**
 * Показывает сообщение об ошибке.
 * @param {any} error
 */
function notifyError(error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(translate(nls_ts.plugin.context.update.error.critical, msg));
}

/**
 * Обрабатывает ошибки, возвращённые бизнес-логикой.
 * @param {UpdateResponse} result
 */
function handleBusinessError(result) {
    switch (result.error) {
        case 'incorrectSection':
            vscode.window.showWarningMessage(translate(nls_ts.plugin.context.update.error.incorrectSection));
            break;
        case 'emptyContexts':
            // ничего не делаем, т.к. это не критично
            break;
        case 'critical':
        default:
            vscode.window.showErrorMessage(
                translate(nls_ts.plugin.context.update.error.critical, result.message || '')
            );
    }
}

// ========== Команда-оркестратор ==========

/**
 * Команда для обновления контекстов в разделе diplodoc.
 * @param {{ fsPath: string }} uri
 */
async function ux_context_update(uri) {
    if (!uri) return;

    const sectionPath = uri.fsPath;

    try {
        // 1. Сбор пользовательского ввода (UI)
        const inputData = await collectUserInput(sectionPath);

        // 2. Выполнение бизнес-логики (сервис)
        const result = await diplodocFrontmatterUpdateContext(sectionPath, inputData);

        // 3. Обработка результата
        if (!result.success) {
            handleBusinessError(result);
            return;
        }

        notifySuccess(result.finalString);
    } catch (err) {
        notifyError(err);
    }
}

module.exports = { ux_context_update };
