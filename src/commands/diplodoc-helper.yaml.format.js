// @ts-nocheck
const vscode = require('vscode');
const { Yaml_Analyze_Selection } = require('../plugins/utils/yaml-inline/index.ts');

// Порядок важен! mono — внутри, bold — снаружи.
// Иначе `**foo**` превратится в `` `**foo**` `` (литеральные звёздочки).
const FORMAT_ORDER = ['mono', 'italic', 'bold'];

const FORMAT_WRAPPERS = {
  bold: (/** @type {string} */ t) => `**${t}**`,
  italic: (/** @type {string} */ t) => `*${t}*`,
  mono: (/** @type {string} */ t) => `\`${t}\``,
};

/**
 * Пункты QuickPick: одна «кнопка» = одна или несколько обёрток.
 * formats — Set из ключей FORMAT_WRAPPERS.
 */
const PICK_ITEMS = [
  // одиночные
  { label: '$(bold)   Ж', description: 'Жирный', formats: new Set(['bold']) },
  { label: '$(italic) К', description: 'Курсив', formats: new Set(['italic']) },
  { label: '$(code)   М', description: 'Моноширинный', formats: new Set(['mono']) },
  // комбинации — тоже «одна кнопка»
  { label: '$(bold) $(italic) Ж+К', description: 'Жирный + Курсив', formats: new Set(['bold', 'italic']) },
  { label: '$(bold) $(code) Ж+М', description: 'Жирный + Моноширинный', formats: new Set(['bold', 'mono']) },
  { label: '$(italic) $(code) К+М', description: 'Курсив + Моноширинный', formats: new Set(['italic', 'mono']) },
  { label: '$(bold) $(italic) $(code) Ж+К+М', description: 'Все три', formats: new Set(['bold', 'italic', 'mono']) },
];

/**
 * Применяет выбранные обёртки к строке в фиксированном порядке.
 * @param {string} text
 * @param {Set<string>} formats
 * @returns {string}
 */
function applyFormats(text, formats) {
  let result = text;
  for (const key of FORMAT_ORDER) {
    if (formats.has(key)) {
      result = FORMAT_WRAPPERS[key](result);
    }
  }
  return result;
}

async function ux_yaml_format_selection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Нет активного редактора');
    return;
  }

  if (editor.document.languageId !== 'yaml') {
    vscode.window.showWarningMessage('Команда работает только в YAML-файлах');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Выделите текст для форматирования');
    return;
  }

  const selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) {
    vscode.window.showWarningMessage('Выделенный текст пуст');
    return;
  }

  const analysis = Yaml_Analyze_Selection.analyze(editor.document, selection);
  if (!analysis.ok) {
    vscode.window.showWarningMessage(
      `Форматирование недоступно: ${analysis.reason}`,
      { modal: false },
    );
    return;
  }

  // ---- «попап с кнопками» ----
  const picked = await vscode.window.showQuickPick(PICK_ITEMS, {
    title: 'Форматирование YAML',
    placeHolder: 'Ж — жирный, К — курсив, М — моноширинный (можно комбинировать)',
    matchOnDescription: false,
    ignoreFocusOut: true,
  });
  if (!picked) return;

  const newText = applyFormats(selectedText, picked.formats);

  // Запоминаем смещение до правки — чтобы потом восстановить выделение
  const startOffset = editor.document.offsetAt(selection.start);

  const ok = await editor.edit(eb => eb.replace(selection, newText));
  if (!ok) {
    vscode.window.showErrorMessage('Не удалось применить форматирование');
    return;
  }

  // Возвращаем выделение на результат — чтобы можно было ещё раз нажать
  const newStart = editor.document.positionAt(startOffset);
  const newEnd = editor.document.positionAt(startOffset + newText.length);
  editor.selection = new vscode.Selection(newStart, newEnd);
  editor.revealRange(new vscode.Range(newStart, newEnd), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

module.exports = { ux_yaml_format_selection };