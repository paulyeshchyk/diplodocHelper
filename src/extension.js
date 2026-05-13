// src/extension.js
const vscode = require("vscode");

const { createSection } = require("./commands/diplodoc-helper.section.Create");
const { deleteSection } = require("./commands/diplodoc-helper.section.Delete");
const { renameSection } = require("./commands/diplodoc-helper.section.Rename");
const { moveSection } = require("./commands/diplodoc-helper.section.Move");
const { copyLink } = require("./commands/diplodoc-helper.link.Copy.js");
const { pasteLink } = require("./commands/diplodoc-helper.link.Paste.js");

const {
  generateContexts,
} = require("./commands/diplodoc-helper.context.Generate");
const {
  generateHelpmap,
} = require("./commands/diplodoc-helper.helpMap.Generate");

/**
 * @param {{ subscriptions: vscode.Disposable[]; extension: { packageJSON: { version: any; }; }; }} context
 */
function activate(context) {
  const createSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.createSection",
    createSection,
  );

  const deleteSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.deleteSection",
    deleteSection,
  );

  const renameSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.renameSection",
    renameSection,
  );

  const moveSectionCmd = vscode.commands.registerCommand(
    "diplodoc-helper.moveSection",
    moveSection,
  );

  const generateContextsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.generateContexts",
    generateContexts,
  );

  const generateHelpmapsCmd = vscode.commands.registerCommand(
    "diplodoc-helper.generateHelpMaps",
    generateHelpmap,
  );

  const copyLinkCmd = vscode.commands.registerCommand(
    "diplodoc-helper.copyLink",
    copyLink,
  );

  const pasteLinkCmd = vscode.commands.registerCommand(
    "diplodoc-helper.pasteLink",
    pasteLink,
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
          const {
            reindexDirectory,
          } = require("./commands/diplodoc-helper.section.Reindex");
          reindexDirectory(uri.fsPath);
          vscode.window.showInformationMessage("Переиндексация завершена!");
        },
      );
    },
  );

  context.subscriptions.push(
    createSectionCmd,
    deleteSectionCmd,
    renameSectionCmd,
    moveSectionCmd,
    generateContextsCmd,
    generateHelpmapsCmd,
    reindexCommand,
  );

  context.subscriptions.push(copyLinkCmd, pasteLinkCmd);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) =>
      updateContext(editor),
    ),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        updateContext(activeEditor);
      }
    }),
  );

  console.log(
    `Diplodoc Helper активирован (${context.extension.packageJSON.version})`,
  );
}

/**
 * @param {vscode.TextEditor | undefined} editor
 */
function updateContext(editor) {
  let canPaste = false;
  if (editor && editor.document) {
    const doc = editor.document;
    const text = doc.getText();
    // Проверяем, есть ли в документе нужный маркер
    if (
      (doc.languageId === "yaml" || doc.languageId === "markdown") &&
      text.includes("---")
    ) {
      canPaste = true;
    }
  }
  vscode.commands.executeCommand(
    "setContext",
    "diplodoc.canPasteLink",
    canPaste,
  );
}

exports.activate = activate;
