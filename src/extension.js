// src/extension.js

const vscode = require('vscode');
const { setupDiplodocConfigChangeWatcher, DiplodocConfigSharedInstance } = require('./config/vscode.config.manager');
const { initNls } = require('../nls_loader');
// const { PasteImageProvider } = require('./pasteProvider');

const { ux_breadcrumbs_generate } = require('./commands/diplodoc-helper.breadCrumb.Generate');
const { ux_context_delete } = require('./commands/diplodoc-helper.context.Delete');
const { ux_context_update } = require('./commands/diplodoc-helper.context.Update');
const { ux_context_run_generation } = require('./commands/diplodoc-helper.context.Generate');
const { ux_directories_wipe } = require('./commands/diplodoc-helper.context.WipeEmptyDirectories.js');
const { ux_helpmap_generate } = require('./commands/diplodoc-helper.helpMap.Generate');
const { ux_helptag_delete } = require('./commands/diplodoc-helper.helptag.Delete');
const { ux_helptag_update } = require('./commands/diplodoc-helper.helptag.Update');
const { ux_image_paste_clipboard } = require('./commands/diplodoc-helper.image.PasteFromClipboard');
const { ux_image_paste_list } = require('./commands/diplodoc-helper.image.PasteFromList');
const { ux_link_copy } = require('./commands/diplodoc-helper.link.Copy.js');
const { ux_link_paste, parseClipboardLink } = require('./commands/diplodoc-helper.link.Paste.js');
const { ux_reindex_directories } = require('./commands/diplodoc-helper.reindex.directories');
const { ux_reindex_figures } = require('./commands/diplodoc-helper.reindex.figures');
const { ux_section_create } = require('./commands/diplodoc-helper.section.Create');
const { ux_section_delete } = require('./commands/diplodoc-helper.section.Delete');
const { ux_section_move } = require('./commands/diplodoc-helper.section.Move');
const { ux_section_rename } = require('./commands/diplodoc-helper.section.Rename');
const { ux_file_delete } = require('./commands/diplodoc-helper.file.Delete');
const { CONFIG_KEY } = require('./plugins/constants');
const { ux_add_anchor } = require('./commands/diplodoc-helper.link.AddAnchor');
const { ContextManager } = require('./ContextMenuManager');

/** @type {ContextManager | null} */
let contextManager = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log(`Diplodoc Helper активирован (${context.extension.packageJSON.version})`);

    //
    setupDiplodocConfigChangeWatcher();

    //читаем конфиг при загрузке расширения
    require('./config/vscode.config.manager').DiplodocConfigSharedInstance();
    const locale = vscode.env.language;
    const rootPath = context.extensionPath;

    initNls(locale, rootPath);

    const cmd01 = vscode.commands.registerCommand('diplodoc-helper.createSection', ux_section_create);
    const cmd02 = vscode.commands.registerCommand('diplodoc-helper.deleteSection', ux_section_delete);
    const cmd03 = vscode.commands.registerCommand('diplodoc-helper.renameSection', ux_section_rename);
    const cmd04 = vscode.commands.registerCommand('diplodoc-helper.moveSection', ux_section_move);
    const cmd07 = vscode.commands.registerCommand('diplodoc-helper.context.Update', ux_context_update);
    const cmd08 = vscode.commands.registerCommand('diplodoc-helper.context.Delete', ux_context_delete);
    const cmd17 = vscode.commands.registerCommand('diplodoc-helper.copyLink', ux_link_copy);
    const cmd18 = vscode.commands.registerCommand('diplodoc-helper.pasteLink', ux_link_paste);
    const cmd19 = vscode.commands.registerCommand('diplodoc-helper.pasteImageFromClipboard', ux_image_paste_clipboard);
    const cmd20 = vscode.commands.registerCommand('diplodoc-helper.pasteImageFromList', ux_image_paste_list);
    const cmd09 = vscode.commands.registerCommand('diplodoc-helper.generateContexts', ux_context_run_generation);
    const cmd10 = vscode.commands.registerCommand('diplodoc-helper.generateHelpMaps', ux_helpmap_generate);
    const cmd11 = vscode.commands.registerCommand('diplodoc-helper.generateBreadcrumbs', ux_breadcrumbs_generate);
    const cmd12 = vscode.commands.registerCommand('diplodoc-helper.reindexDirectories', ux_reindex_directories);
    const cmd13 = vscode.commands.registerCommand('diplodoc-helper.reindexFigures', ux_reindex_figures);
    const cmd14 = vscode.commands.registerCommand('diplodoc-helper.wipeEmptyDirectories', ux_directories_wipe);
    const cmd15 = vscode.commands.registerCommand('diplodoc-helper.helptag.Update', ux_helptag_update);
    const cmd16 = vscode.commands.registerCommand('diplodoc-helper.helptag.Delete', ux_helptag_delete);
    const cmd21 = vscode.commands.registerCommand('diplodoc-helper.link.addAnchor', ux_add_anchor);
    const cmd31 = vscode.commands.registerCommand('diplodoc-helper.file.delete', ux_file_delete);
    const cmd99 = vscode.commands.registerCommand('diplodoc-helper.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_KEY);
    });

    context.subscriptions.push(cmd01, cmd02, cmd03, cmd04);
    context.subscriptions.push(cmd07, cmd08);
    context.subscriptions.push(cmd09, cmd10, cmd11);
    context.subscriptions.push(cmd12, cmd13);
    context.subscriptions.push(cmd14);
    context.subscriptions.push(cmd15, cmd16);
    context.subscriptions.push(cmd17, cmd18, cmd19, cmd20);
    context.subscriptions.push(cmd21);
    context.subscriptions.push(cmd31);
    context.subscriptions.push(cmd99);

    const config = DiplodocConfigSharedInstance();
    contextManager = new ContextManager(config.usePollingForContext, config.contextPollingInterval, context);

    // Регистрация
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
