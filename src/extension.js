// src/extension.js
const vscode = require("vscode");
const { createSection } = require("./diplodoc-helper.createSection");
const { deleteSection } = require("./diplodoc-helper.deleteSection");
const { renameSection } = require("./diplodoc-helper.renameSection");
const { generateContexts } = require("./diplodoc-helper.generateContexts");
const { generateHelpmaps } = require("./diplodoc-helper.generateHelpMap");

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
  // Регистрируем команду createSection
  const createSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.createSection",
    createSection,
  );

  // Регистрируем команду deleteSection
  const deleteSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.deleteSection",
    deleteSection,
  );

  // Регистрируем команду renameSection
  const renameSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.renameSection",
    renameSection,
  );

  // Регистрируем команду generateContexts
  const generateContextsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.generateContexts",
    generateContexts,
  );

  // Регистрируем команду runGeneration (убрал лишнюю 's')
  const generateHelpmapsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.runGeneration",
    generateHelpmaps,
  );

  // Внутри функции activate
  let reindexCommand = vscode.commands.registerCommand(
    "diplodoc-helper.reindex",
    async (uri) => {
      if (!uri) return;

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Переиндексация Diplodoc...",
          cancellable: false,
        },
        async () => {
          const { reindexDirectory } = require("./diplodoc-helper.reindex");
          reindexDirectory(uri.fsPath);
          vscode.window.showInformationMessage(
            "Переиндексация завершена успешно!",
          );
        },
      );
    },
  );

  context.subscriptions.push(
    createSectionCmd,
    deleteSectionCmd,
    renameSectionCmd,
    generateContextsCmd,
    generateHelpmapsCmd,
    reindexCommand,
  );

  console.log("Diplodoc Helper активирован!");
}

exports.activate = activate;
