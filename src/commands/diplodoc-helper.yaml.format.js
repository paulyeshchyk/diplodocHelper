// @ts-nocheck
// src/commands/diplodoc-helper.yaml.format.js

const vscode = require('vscode');
const { nls_ts, translate } = require('../nls_ts.js');
const { Yaml_Analyze_Selection } = require('../plugins/utils/yaml-inline/index.ts');
const { Yaml_Read_ValueRange } = require('../plugins/utils/yaml-inline/value-range.ts');
const { Yaml_Detect_Format } = require('../plugins/utils/yaml-inline/format-detect.ts');
const { Yaml_Toggle_Format } = require('../plugins/utils/yaml-inline/toggle-format.ts');

const FORMAT_KEYS = [
  { key: 'bold', icon: '$(bold)', shortKey: 'short.bold', descKey: 'bold' },
  { key: 'italic', icon: '$(italic)', shortKey: 'short.italic', descKey: 'italic' },
  { key: 'mono', icon: '$(code)', shortKey: 'short.mono', descKey: 'mono' },
];

async function ux_yaml_format_selection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.yaml.format.error.noEditor));
    return;
  }
  if (editor.document.languageId !== 'yaml') {
    vscode.window.showWarningMessage(translate(nls_ts.plugin.yaml.format.error.notYaml));
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage(translate(nls_ts.plugin.yaml.format.error.noSelection));
    return;
  }

  // 1. Guard: YAML-value + tag-balance
  const analysis = Yaml_Analyze_Selection.analyze(editor.document, selection);
  if (!analysis.ok) {
    vscode.window.showWarningMessage(
      translate(nls_ts.plugin.yaml.format.error.cannotFormat, analysis.reason),
    );
    return;
  }


  // helper: конвертирует plain {line, character} в vscode.Position,
  // пропускает vscode.Position как есть, клампит к границам документа.
  const toVscodePosition = p => {
    if (p instanceof vscode.Position) return p;
    const line = Number(p?.line ?? 0);
    const character = Number(p?.character ?? 0);
    const doc = editor.document;
    const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
    const lineText = doc.lineAt(safeLine).text;
    const safeChar = Math.max(0, Math.min(character, lineText.length));
    if (safeLine !== line || safeChar !== character) {
      console.warn(
        `[yaml.format] clamped position ${JSON.stringify(p)} → ` +
        `(${safeLine}, ${safeChar}); doc has ${doc.lineCount} lines, ` +
        `line ${safeLine} has ${lineText.length} chars`,
      );
    }
    return new vscode.Position(safeLine, safeChar);
  };

  const contentRange = Yaml_Read_ValueRange.read(
    editor.document, selection, analysis.kind, analysis.owner,
  )

  const fullText = editor.document.getText();
  const detectStart = editor.document.offsetAt(toVscodePosition(contentRange.start));
  const detectEnd = editor.document.offsetAt(toVscodePosition(contentRange.end));

  const active = Yaml_Detect_Format.detect(fullText, detectStart, detectEnd);

  const items = FORMAT_KEYS.map(f => {
    const shortLabel = translate(nls_ts.plugin.yaml.format[f.shortKey]);
    const desc = translate(nls_ts.plugin.yaml.format[f.descKey]);
    return {
      label: `${active[f.key] ? '$(check)' : '$(circle-outline)'} ${f.icon} ${shortLabel}`,
      description: active[f.key]
        ? translate(nls_ts.plugin.yaml.format.activeHint, desc)
        : translate(nls_ts.plugin.yaml.format.inactiveHint, desc),
      key: f.key,
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    title: translate(nls_ts.plugin.yaml.format.title),
    placeHolder: translate(nls_ts.plugin.yaml.format.placeholder),
    matchOnDescription: false,
    ignoreFocusOut: true,
  });
  if (!picked) return;

  // 3. Toggle
  const result = Yaml_Toggle_Format.toggle(fullText, detectStart, detectEnd, picked.key);
  if (result.action === 'noop') return;

  // 4. Применить edits (в порядке, как вернул модуль — с конца)
  const ok = await editor.edit(eb => {
    for (const e of result.edits) {
      const from = editor.document.positionAt(e.offset);
      const to = editor.document.positionAt(e.offset + e.length);
      eb.replace(new vscode.Range(from, to), e.replacement);
    }
  });
  if (!ok) {
    vscode.window.showErrorMessage(translate(nls_ts.plugin.yaml.format.error.editFailed));
    return;
  }

  // 5. Восстановить selection
  const newStart = editor.document.positionAt(result.newStart);
  const newEnd = editor.document.positionAt(result.newEnd);
  editor.selection = new vscode.Selection(newStart, newEnd);
  editor.revealRange(new vscode.Range(newStart, newEnd), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}



module.exports = { ux_yaml_format_selection };