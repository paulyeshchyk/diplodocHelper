// src/commands/diplodoc-helper.context.Update.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { isDiplodocSection } = require("../utils");
const { parse, stringify } = require("../utils/frontmatter");

/**
 * @typedef {Object} ContextDto
 * @property {any} label
 * @property {string} action
 * @property {any} [value]
 */

/**
 * Надёжно парсит строку в массив контекстов.
 * Поддерживает запятые, пробелы, несколько разделителей подряд.
 * Пустые значения игнорируются.
 * @param {string} input
 * @returns {string[]}
 */
function parseContexts(input) {
  if (!input || typeof input !== "string") return [];

  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * @param {{ fsPath: string }} uri
 */
async function updateContext(uri) {
  if (!uri) return;

  const sectionPath = uri.fsPath;
  if (!isDiplodocSection(sectionPath)) {
    vscode.window.showWarningMessage(
      "context можно изменять только в полноценных разделах Diplodoc.",
    );
    return;
  }

  const indexMdPath = path.join(sectionPath, "index.md");

  /**
   * @type {any[]}
   */
  let currentContexts = [];
  if (fs.existsSync(indexMdPath)) {
    const content = fs.readFileSync(indexMdPath, "utf8");
    const { data } = parse(content);
    currentContexts = parseContexts(data.context || "");
  }

  let finalContexts = [...currentContexts];

  if (currentContexts.length === 0) {
    // Создание первого контекста
    const input = await vscode.window.showInputBox({
      prompt: "Введите context (можно несколько через запятую или пробел)",
      placeHolder: "номенклатура, справочник товаров, продажа",
      validateInput: (v) =>
        parseContexts(v).length === 0 ? "context не может быть пустым" : null,
    });

    if (!input) return;
    finalContexts = parseContexts(input);
  } else {
    /** @type {ContextDto[]} */
    const options = [
      { label: "$(plus) Добавить новый контекст...", action: "add" },
      ...currentContexts.map((ctx) => ({
        label: ctx,
        action: "edit",
        value: ctx,
      })),
    ];

    /** @type {ContextDto | undefined} */
    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Что вы хотите сделать с context?",
    });

    if (!selected) return;

    if (selected.action === "add") {
      const input = await vscode.window.showInputBox({
        prompt:
          "Введите новый контекст (можно несколько через запятую или пробел)",
        placeHolder: "отчёт, аналитика, дашборд",
      });

      if (!input) return;
      const newOnes = parseContexts(input);

      for (const item of newOnes) {
        if (!finalContexts.includes(item)) {
          finalContexts.push(item);
        }
      }
    } else {
      // Редактирование
      const oldValue = selected.value;
      if (!oldValue) return;

      const newInput = await vscode.window.showInputBox({
        prompt: `Изменить "${oldValue}" на:`,
        value: oldValue,
        validateInput: (v) =>
          parseContexts(v).length === 0
            ? "Значение не может быть пустым"
            : null,
      });

      if (newInput === undefined) return;

      const newParsed = parseContexts(newInput);

      finalContexts = finalContexts.filter((c) => c !== oldValue);
      for (const item of newParsed) {
        if (!finalContexts.includes(item)) {
          finalContexts.push(item);
        }
      }
    }
  }

  if (finalContexts.length === 0) return;

  const finalString = finalContexts.join(", ");

  try {
    let content = fs.readFileSync(indexMdPath, "utf8");
    const { data, content: body } = parse(content);

    data.context = finalString;
    const updatedContent = stringify(data, body);

    fs.writeFileSync(indexMdPath, updatedContent, "utf8");

    vscode.window.showInformationMessage(`context обновлён: "${finalString}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Ошибка при обновлении context: ${msg}`);
  }
}

module.exports = { updateContext };
