// src/extension.js
const vscode = require('vscode');
const { createSection } = require('./diplodoc-helper.createSection');
const { generateContexts } = require('./diplodoc-helper.generateContexts');

function activate(context) {
    // Регистрируем команду createSection
    const createSectionCmd = vscode.commands.registerCommand('diplodoc-helper.createSection', createSection);
    // Регистрируем команду generateContexts
    const generateContextsCmd = vscode.commands.registerCommand('diplodoc-helper.generateContexts', generateContexts);
    
    context.subscriptions.push(createSectionCmd, generateContextsCmd);
    
    console.log('Diplodoc Helper активирован!');
}

exports.activate = activate;