// src/commands/diplodoc-helper.context.Delete.js
const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/shared/validators/diplodocDirectoryValidator.js');
const { frontmatterReadContexts } = require('../plugins/shared/context/frontmatter/frontmatter.facade.js');
const {
    diplodocFrontmatterDeleteContexts,
} = require('../plugins/shared/services/frontmatter/diplodoc.frontmatter.service.context.js');

/**
 * Получает путь к index.md раздела, если раздел валидный.
 * @param {string} sectionPath - путь к папке раздела
 * @returns {string|null} путь к index.md или null, если раздел невалидный или файл отсутствует
 */
function getIndexMdPathIfValid(sectionPath) {
    if (!sectionPath || !isDiplodocSection(sectionPath)) return null;
    const indexMdPath = path.join(sectionPath, 'index.md');
    if (!fs.existsSync(indexMdPath)) return null;
    return indexMdPath;
}

/**
 * Запрашивает у пользователя выбор контекста для удаления, если их несколько.
 * @param {string[]} contexts - все доступные контексты
 * @returns {Promise<string | undefined>} выбранный контекст или undefined при отмене
 */
async function askUserToPickContext(contexts) {
    if (contexts.length === 1) {
        return contexts[0];
    }
    const picked = await vscode.window.showQuickPick(contexts, {
        placeHolder: translate(nls_ts.plugin.context.delete.dialog.placeholder),
    });
    return picked; // может быть undefined
}

/**
 * Запрашивает у пользователя подтверждение удаления.
 * @param {string} contextName - имя удаляемого контекста
 * @returns {Promise<boolean>} true – подтверждено, false – отменено
 */
async function askUserToConfirmDeletion(contextName) {
    const confirmText = translate(nls_ts.plugin.context.delete.confirm.button);
    const result = await vscode.window.showWarningMessage(
        translate(nls_ts.plugin.context.delete.confirm.prompt, contextName),
        { modal: true },
        confirmText
    );
    return result === confirmText;
}

/**
 * Показывает уведомление об успехе или ошибке.
 * @param {boolean} success
 * @param {string} contextName - имя контекста
 * @param {unknown} [error] - объект ошибки, если неудача
 */
function notifyUser(success, contextName, error) {
    if (success) {
        vscode.window.showInformationMessage(translate(nls_ts.plugin.context.delete.info.success, contextName));
    } else {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.context.delete.error.critical, msg));
    }
}

/**
 * Команда для удаления контекста из раздела diplodoc.
 * @param {{ fsPath: string }} uri
 */
async function ux_context_delete(uri) {
    // 1. Проверка пути
    const indexMdPath = getIndexMdPathIfValid(uri?.fsPath);
    if (!indexMdPath) return;

    // 2. Чтение контекстов
    let contexts = frontmatterReadContexts(indexMdPath);
    if (contexts.length === 0) return;

    // 3. Выбор контекста (UI)
    const toDelete = await askUserToPickContext(contexts);
    if (!toDelete) return;

    // 4. Подтверждение (UI)
    const confirmed = await askUserToConfirmDeletion(toDelete);
    if (!confirmed) return;

    // 5. Выполнение операции (основная логика)
    try {
        diplodocFrontmatterDeleteContexts(indexMdPath, contexts, toDelete);
        notifyUser(true, toDelete);
    } catch (err) {
        notifyUser(false, toDelete, err);
    }
}

module.exports = { ux_context_delete };
