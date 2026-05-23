// src/commands/diplodoc-helper.context.Delete.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("../utils");
const { parse, stringify, remove } = require("../utils/frontmatter");

/**
 * @param {{ fsPath: string }} uri
 */
async function deleteContext(uri) {
  if (!uri) return;

  const sectionPath = uri.fsPath;
  if (!isDiplodocSection(sectionPath)) return;

  const indexMdPath = path.join(sectionPath, "index.md");
  if (!fs.existsSync(indexMdPath)) return;

  let contexts = [];
  try {
    const content = fs.readFileSync(indexMdPath, "utf8");
    const { data } = parse(content);
    const current = data.context || "";
    contexts = current
      .split(",")
      .map((/** @type {string} */ s) => s.trim())
      .filter(Boolean);
  } catch {
    return;
  }

  if (contexts.length === 0) return; // ничего не делаем

  let toDelete;

  if (contexts.length === 1) {
    toDelete = contexts[0];
  } else {
    toDelete = await vscode.window.showQuickPick(contexts, {
      placeHolder: "Выберите context для удаления",
    });
    if (!toDelete) return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Удалить context "${toDelete}"?`,
    { modal: true },
    "Удалить",
  );

  if (confirm !== "Удалить") return;

  try {
    let content = fs.readFileSync(indexMdPath, "utf8");
    const { data, content: body } = parse(content);

    const remaining = contexts.filter((/** @type {any} */ c) => c !== toDelete);

    if (remaining.length === 0) {
      content = remove(content, "context");
    } else {
      data.context = remaining.join(", ");
      content = stringify(data, body);
    }

    fs.writeFileSync(indexMdPath, content, "utf8");

    vscode.window.showInformationMessage(`context "${toDelete}" удалён.`);
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    vscode.window.showErrorMessage(`Ошибка при удалении context: ${msg}`);
  }
}

module.exports = { deleteContext };
