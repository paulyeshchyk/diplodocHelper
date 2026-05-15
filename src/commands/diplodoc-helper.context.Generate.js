// diplodoc-helper.generateContexts.js
const { runGeneration } = require("../plugins/contexts/сontexts");
const path = require("path");
let vscode = require("vscode");

async function generateContexts() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;
  const projectRoot = workspaceFolders[0].uri.fsPath;
  const DOCS_ROOT = projectRoot; //path.join(projectRoot, "docs");

  const results = runGeneration(DOCS_ROOT);

  if (results.success.length > 0) {
    vscode.window.showInformationMessage(
      `Контексты обновлены: ${results.success.join(", ")}`,
    );
  } else {
    vscode.window.showErrorMessage(
      "Не удалось найти теги 'context:' в документации.",
    );
  }
}
module.exports = { generateContexts, runGeneration };
