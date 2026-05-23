// src/commands/diplodoc-helper.helptag.Update.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("../utils");
const { parse, update } = require("../utils/frontmatter");

const SErrorHelptagChangeIncorrectFolder =
  "helptag можно изменять только в полноценных разделах Diplodoc.";

const SErrorEmptyHelptag = "helptag не может быть пустым";
const SHintAddHelptag = "Например: nomenclature, invoice, report";
const SPromptAddHelptag = "Введите значение helptag";

/**
 * @param {{ fsPath: string }} uri
 */
async function updateHelptag(uri) {
  if (!uri) return;

  const sectionPath = uri.fsPath;
  if (!isDiplodocSection(sectionPath)) {
    vscode.window.showWarningMessage(SErrorHelptagChangeIncorrectFolder);
    return;
  }

  const indexMdPath = path.join(sectionPath, "index.md");
  let currentHelptag = "";

  if (fs.existsSync(indexMdPath)) {
    const content = fs.readFileSync(indexMdPath, "utf8");
    const { data } = parse(content);
    currentHelptag = data.helptag || "";
  }

  const newHelptag = await vscode.window.showInputBox({
    prompt: SPromptAddHelptag,
    value: currentHelptag,
    placeHolder: SHintAddHelptag,
    validateInput: (value) => {
      if (!value || value.trim() === "") {
        return SErrorEmptyHelptag;
      }
      return null;
    },
  });

  if (newHelptag === undefined) return;

  try {
    let content = fs.readFileSync(indexMdPath, "utf8");
    content = update(content, "helptag", newHelptag.trim());

    fs.writeFileSync(indexMdPath, content, "utf8");

    const STipHelptagUpdated = `helptag обновлён: "${newHelptag}"`;
    vscode.window.showInformationMessage(STipHelptagUpdated);
  } catch (err) {
    let msg = err instanceof Error ? err.message : `${err}`;
    const SErrorHelptagNotUpdated = `Ошибка при обновлении helptag: ${msg}`;
    vscode.window.showErrorMessage(SErrorHelptagNotUpdated);
  }
}

module.exports = { updateHelptag };
