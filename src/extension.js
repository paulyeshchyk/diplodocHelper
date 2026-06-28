// src/extension.js

const vscode = require('vscode');
const {
    setupDiplodocConfigChangeWatcher,
    DiplodocConfigSharedInstance,
} = require('./plugins/manifest/config/vscode.config.manager');
const { initNls } = require('./nls_loader');
const { commandHandlers } = require('./commands'); // импортируем реестр
const { ContextManager } = require('./ContextMenuManager');
const { BrokenLinkCodeActionProvider } = require('./commands/vscode.linter.links.brokenLinkCodeActionProvider');
const { buildClipboardLink } = require('./plugins/shared/builders/clipboardLinkBuilder');

/** @type {ContextManager | null} */
let contextManager = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log(`Diplodoc Helper активирован (${context.extension.packageJSON.version})`);

    setupDiplodocConfigChangeWatcher();
    require('./plugins/manifest/config/vscode.config.manager').DiplodocConfigSharedInstance();
    const locale = vscode.env.language;
    const rootPath = context.extensionPath;
    initNls(locale, rootPath);

    // Регистрируем все команды из реестра
    const registeredCommands = [];
    for (const [commandName, handler] of Object.entries(commandHandlers)) {
        const cmd = vscode.commands.registerCommand(commandName, handler);
        registeredCommands.push(cmd);
    }
    context.subscriptions.push(...registeredCommands);

    // Регистрируем остальные провайдеры
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ language: 'markdown' }, new BrokenLinkCodeActionProvider())
    );

    // Настройка контекстного менеджера
    const config = DiplodocConfigSharedInstance();
    contextManager = new ContextManager(config.usePollingForContext, config.contextPollingInterval, context);
    contextManager.registerContextKey('diplodoc-helper:canPasteMarkdownLink', async () => {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            const link = buildClipboardLink(clipboardText);
            return link !== null;
        } catch (error) {
            console.error('Ошибка при проверке ссылки:', error);
            return false;
        }
    });
}

function deactivate() {
    if (contextManager !== null) {
        contextManager.forceStop();
    }
}

module.exports = {
    activate,
    deactivate,
};
