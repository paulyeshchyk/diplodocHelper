// src/extension.js
const vscode = require('vscode');
const { createSection } = require('./diplodoc-helper.createSection');
const { deleteSection } = require('./diplodoc-helper.deleteSection');
const { generateContexts } = require('./diplodoc-helper.generateContexts');
const { generateHelpmaps } = require('./diplodoc-helper.generateHelpMap');

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {

    // Регистрируем команду createSection
    const createSectionCmd = vscode.commands.registerCommand('diplodoc-helper.createSection', createSection);

    // Регистрируем команду deleteSection
    const deleteSectionCmd = vscode.commands.registerCommand('diplodoc-helper.deleteSection', deleteSection);

    // Регистрируем команду generateContexts
    const generateContextsCmd = vscode.commands.registerCommand('diplodoc-helper.generateContexts', generateContexts);

    // Регистрируем команду runGeneration (убрал лишнюю 's')
    const generateHelpmapsCmd = vscode.commands.registerCommand(
        'diplodoc-helper.runGeneration', 
        generateHelpmaps
    );

    context.subscriptions.push(createSectionCmd, deleteSectionCmd, generateContextsCmd, generateHelpmapsCmd);
    
    console.log('Diplodoc Helper активирован!');
}

exports.activate = activate;