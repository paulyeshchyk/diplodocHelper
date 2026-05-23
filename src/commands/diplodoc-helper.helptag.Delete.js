// src/commands/diplodoc-helper.helptag.Delete.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("../utils");
const { parse, remove } = require("../utils/frontmatter");

/**
 * @param {{ fsPath: string }} uri
 */
async function deleteHelptag(uri) {
  if (!uri) return;

  const sectionPath = uri.fsPath;
  if (!isDiplodocSection(sectionPath)) {
    return; // silently
  }

  const indexMdPath = path.join(sectionPath, "index.md");
  if (!fs.existsSync(indexMdPath)) return;

  let currentHelptag = "";
  try {
    const content = fs.readFileSync(indexMdPath, "utf8");
    const { data } = parse(content);
    currentHelptag = data.helptag || "";
  } catch {
    return;
  }

  if (!currentHelptag) {
    return; // silently - no helptag
  }

  const confirm = await vscode.window.showWarningMessage(
    `Удалить helptag "${currentHelptag}" из раздела?`,
    { modal: true },
    "Удалить",
  );

  if (confirm !== "Удалить") return;

  try {
    let content = fs.readFileSync(indexMdPath, "utf8");
    content = remove(content, "helptag");

    fs.writeFileSync(indexMdPath, content, "utf8");

    vscode.window.showInformationMessage(`helptag "${currentHelptag}" удалён.`);
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    vscode.window.showErrorMessage(`Ошибка при удалении helptag: ${msg}`);
  }
}

module.exports = { deleteHelptag };
