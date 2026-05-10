// src/extension.js
const vscode = require("vscode");

const { createSection } = require("./commands/diplodoc-helper.section.Create");
const { deleteSection } = require("./commands/diplodoc-helper.section.Delete");
const { renameSection } = require("./commands/diplodoc-helper.section.Rename");
const { generateContexts } = require("./commands/generateContexts");
const { generateHelpmaps } = require("./commands/generateHelpmap");

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
  const createSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.createSection",
    createSection
  );

  const deleteSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.deleteSection",
    deleteSection
  );

  const renameSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.renameSection",
    renameSection
  );

  const generateContextsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.generateContexts",
    generateContexts
  );

  const generateHelpmapsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.runGeneration",
    generateHelpmaps
  );

  const reindexCommand = vscode.commands.registerCommand(
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
          const { reindexDirectory } = require("./commands/diplodoc-helper.section.Reindex");
          reindexDirectory(uri.fsPath);
          vscode.window.showInformationMessage("Переиндексация завершена!");
        }
      );
    }
  );

  context.subscriptions.push(
    createSectionCmd,
    deleteSectionCmd,
    renameSectionCmd,
    generateContextsCmd,
    generateHelpmapsCmd,
    reindexCommand
  );

  console.log("✅ Diplodoc Helper активирован (рефакторинг v1.1)");
}

exports.activate = activate;