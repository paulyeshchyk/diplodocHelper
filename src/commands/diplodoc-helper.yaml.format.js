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

/**
 * Класс для валидации редактора, языка и текущего выделения.
 */
class YamlSelectionValidator {
  static validate(editor) {
    if (!editor) {
      vscode.window.showErrorMessage(translate(nls_ts.plugin.yaml.format.error.noEditor));
      return { ok: false };
    }
    if (editor.document.languageId !== 'yaml') {
      vscode.window.showWarningMessage(translate(nls_ts.plugin.yaml.format.error.notYaml));
      return { ok: false };
    }
    if (editor.selection.isEmpty) {
      vscode.window.showWarningMessage(translate(nls_ts.plugin.yaml.format.error.noSelection));
      return { ok: false };
    }

    const analysis = Yaml_Analyze_Selection.analyze(editor.document, editor.selection);
    if (!analysis.ok) {
      vscode.window.showWarningMessage(
        translate(nls_ts.plugin.yaml.format.error.cannotFormat, analysis.reason),
      );
      return { ok: false };
    }

    return { ok: true, analysis };
  }
}

/**
 * Класс для работы с позициями и конвертацией смещений в VS Code Position.
 */
class YamlPositionService {
  static toVscodePosition(editor, p) {
    if (p instanceof vscode.Position) return p;
    const line = Number(p?.line ?? 0);
    const character = Number(p?.character ?? 0);
    const doc = editor.document;
    const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
    const lineText = doc.lineAt(safeLine).text;
    const safeChar = Math.max(0, Math.min(character, lineText.length));
    return new vscode.Position(safeLine, safeChar);
  }

  static getContentRange(editor, selection, analysis) {
    return Yaml_Read_ValueRange.read(
      editor.document, selection, analysis.kind, analysis.owner,
    );
  }
}

/**
 * Класс для модификации документа (применение изменений и обновление выделения).
 */
class YamlDocumentMutator {
  static async applyToggle(editor, contentRange, formatKey) {
    const fullText = editor.document.getText();
    const detectStart = editor.document.offsetAt(YamlPositionService.toVscodePosition(editor, contentRange.start));
    const detectEnd = editor.document.offsetAt(YamlPositionService.toVscodePosition(editor, contentRange.end));

    const result = Yaml_Toggle_Format.toggle(fullText, detectStart, detectEnd, formatKey);
    if (result.action === 'noop') return { success: false };

    const ok = await editor.edit(eb => {
      for (const e of result.edits) {
        const from = editor.document.positionAt(e.offset);
        const to = editor.document.positionAt(e.offset + e.length);
        eb.replace(new vscode.Range(from, to), e.replacement);
      }
    });

    if (!ok) {
      vscode.window.showErrorMessage(translate(nls_ts.plugin.yaml.format.error.editFailed));
      return { success: false };
    }

    const newStartPos = editor.document.positionAt(result.newStart);
    const newEndPos = editor.document.positionAt(result.newEnd);

    editor.selection = new vscode.Selection(newStartPos, newEndPos);

    return {
      success: true,
      newRange: { start: newStartPos, end: newEndPos }
    };
  }
}

/**
 * Класс для генерации элементов меню QuickPick с учётом текущего состояния форматирования.
 */
class YamlFormatPickerBuilder {
  static buildItems(editor, contentRange) {
    const fullText = editor.document.getText();
    const detectStart = editor.document.offsetAt(YamlPositionService.toVscodePosition(editor, contentRange.start));
    const detectEnd = editor.document.offsetAt(YamlPositionService.toVscodePosition(editor, contentRange.end));
    const active = Yaml_Detect_Format.detect(fullText, detectStart, detectEnd);

    const formatItems = FORMAT_KEYS.map(f => {
      const desc = translate(nls_ts.plugin.yaml.format[f.descKey]);
      return {
        label: `${active[f.key] ? '$(check)' : '$(circle-outline)'} ${f.icon}`,
        description: active[f.key]
          ? translate(nls_ts.plugin.yaml.format.activeHint, desc)
          : translate(nls_ts.plugin.yaml.format.inactiveHint, desc),
        key: f.key,
      };
    });

    const closeItem = {
      label: '$(close)' + ' ' + translate('plugin.yaml.format.closeButtonLabel'),
      description: translate('plugin.yaml.format.closeButtonDescription'),
      key: '__close__'
    };

    return [...formatItems, closeItem];
  }
}

/**
 * Оркестрант, управляющий жизненным циклом интерактивного форматирования через QuickPick.
 */
class YamlFormatOrchestrator {
  constructor(editor, analysis) {
    this.editor = editor;
    this.contentRange = YamlPositionService.getContentRange(editor, editor.selection, analysis);
    this.picker = vscode.window.createQuickPick();

    this.initPicker();
  }

  initPicker() {
    this.picker.title = translate(nls_ts.plugin.yaml.format.title);
    this.picker.placeholder = translate(nls_ts.plugin.yaml.format.placeholder);
    this.picker.ignoreFocusOut = true;

    this.updateItems();

    this.picker.onDidAccept(async () => this.handleAccept());

    // Сохраняем ссылки на подписки, чтобы отписаться при закрытии
    this.disposables = [
      this.picker,
      // Закрываем пикер, если пользователь переключился на другой файл/вкладку
      vscode.window.onDidChangeActiveTextEditor(activeEditor => {
        if (activeEditor !== this.editor) {
          this.picker.hide();
        }
      }),
      // Закрываем пикер, если фокус ушел из окна VS Code
      vscode.window.onDidChangeWindowState(state => {
        if (!state.focused) {
          this.picker.hide();
        }
      }),
      this.picker.onDidHide(() => {
        // Очищаем все слушатели при закрытии
        this.disposables.forEach(d => d.dispose());
      })
    ];
  }

  updateItems() {
    this.picker.items = YamlFormatPickerBuilder.buildItems(this.editor, this.contentRange);
  }

  async handleAccept() {
    const picked = this.picker.selectedItems[0];
    if (!picked) return;

    if (picked.key === '__close__') {
      this.picker.hide();
      return;
    }

    const currentKey = picked.key;
    const mutatorResult = await YamlDocumentMutator.applyToggle(this.editor, this.contentRange, currentKey);

    if (!mutatorResult.success) return;

    this.contentRange = mutatorResult.newRange;

    this.updateItems();

    const activeItem = this.picker.items.find(item => item.key === currentKey);
    if (activeItem) {
      this.picker.activeItems = [activeItem];
    }
  }

  show() {
    this.picker.show();
  }
}

/**
 * Главная точка входа команды VS Code.
 */
async function ux_yaml_format_selection() {
  const editor = vscode.window.activeTextEditor;

  const validation = YamlSelectionValidator.validate(editor);
  if (!validation.ok) return;

  const orchestrator = new YamlFormatOrchestrator(editor, validation.analysis);
  orchestrator.show();
}

module.exports = { ux_yaml_format_selection };