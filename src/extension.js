// src/extension.js

const vscode = require('vscode');
const { setupDiplodocConfigChangeWatcher, DiplodocConfigSharedInstance } = require('./config/vscode.config.manager.js');
const { initNls } = require('./nls_loader');
const { buildAllHandlers } = require('./contrib/build.ts');
const { COMMANDS, INTERNAL_HANDLERS, CONFIG_KEY } = require('./contrib/index.ts');
const { ContextManager } = require('./ContextMenuManager');
const { BrokenLinkCodeActionProvider } = require('./commands/vscode.linter.links.brokenLinkCodeActionProvider');
const { parseClipboardLink } = require('./commands/diplodoc-helper.link.Paste');
const { AbbrCodeActionProvider } = require('./commands/vscode.abbr.CodeActionProvider');
const { AbbrHighlighter } = require('./commands/vscode.abbr.Highlighter');
const { TermCodeActionProvider } = require('./commands/vscode.term.CodeActionProvider');
const { TermHighlighter } = require('./commands/vscode.term.Highlighter');

/** @type {ContextManager | null} */
let contextManager = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log(`Diplodoc Helper активирован (${context.extension.packageJSON.version})`);

    setupDiplodocConfigChangeWatcher();
    require('./config/vscode.config.manager.js').DiplodocConfigSharedInstance();
    const locale = vscode.env.language;
    const rootPath = context.extensionPath;
    initNls(locale, rootPath);

    const commandHandlers = buildAllHandlers(COMMANDS, INTERNAL_HANDLERS);
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
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ language: 'markdown' }, new AbbrCodeActionProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ language: 'markdown' }, new TermCodeActionProvider())
    );

    // Подсветка <abbr>…</abbr> в markdown-редакторе
    const abbrHighlighter = new AbbrHighlighter(context);
    context.subscriptions.push(abbrHighlighter);
    const termHighlighter = new TermHighlighter(context);
    context.subscriptions.push(termHighlighter);

    // Настройка контекстного менеджера
    const config = DiplodocConfigSharedInstance();
    contextManager = new ContextManager(config.usePollingForContext, config.contextPollingInterval, context);
    contextManager.registerContextKey('diplodoc-helper:canPasteMarkdownLink', async () => {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            const link = parseClipboardLink(clipboardText);
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
