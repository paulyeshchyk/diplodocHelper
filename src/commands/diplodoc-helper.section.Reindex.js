// src/commands/diplodoc-helper.section.Reindex.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const path = require('path');

const { reindexDirectory } = require('../core/reindex');

/**
 * @param {{ fsPath: string }} uri
 */
async function reindexCommand(uri) {
  if (!uri) return;

  const targetDir = uri.fsPath;

  /** @type {import("../core/reindex").ReindexWarning[]} */
  let allWarnings = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: translate(nls_ts.plugin.section.reindex.progress.text),
      cancellable: false,
    },
    async () => {
      allWarnings = reindexDirectory(targetDir);
    }
  );

  vscode.window.showInformationMessage(translate(nls_ts.plugin.section.reindex.info.success));

  // Показываем предупреждения
  if (allWarnings.length > 0) {
    showWarnings(allWarnings);
  }
}

/**
 * @param {import("../core/reindex").ReindexWarning[]} warnings
 */
function showWarnings(warnings) {
  const messages = new Set();

  for (const w of warnings) {
    messages.add(w.message);
  }

  if (messages.size === 0) return;

  const messageList = Array.from(messages).join('\n');

  vscode.window.showWarningMessage(
    translate(nls_ts.plugin.section.reindex.warning.text),
    { modal: true, detail: messageList },
    translate(nls_ts.plugin.section.reindex.warning.button)
  );
}

module.exports = { reindexCommand };
