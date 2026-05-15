// diplodoc-helper.breadCrumb.Generate.js
const { runGeneration } = require("../plugins/breadcrumb/breadcrumb");
const path = require("path");
let vscode = require("vscode");

const BuildFolderName = "build";

async function generateBreadcrumbs() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;
  const projectRoot = workspaceFolders[0].uri.fsPath;
  const BUILD_ROOT = path
    .join(projectRoot, "..", BuildFolderName)
    .replace(/\\/g, "/");

  const results = runGeneration(BUILD_ROOT);

  if (results.success.length > 0) {
    vscode.window.showInformationMessage(
      `"Хлебные крошки" обновлены: ${results.success.join(", ")}`,
    );
  } else {
    vscode.window.showErrorMessage(
      `"Хлебные крошки" не обновлены. Папка не найдена: ${results.failed.join(", ")}`,
      {
        modal: true,
        detail:
          "Пересоберите проект.\nРезультат сбоки должен находиться в папке build",
      },
    );
  }
}
module.exports = { generateBreadcrumbs, runGeneration };
