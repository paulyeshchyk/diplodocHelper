// src/plugins/utils/yaml-inline/value-context.ts

import { Yaml_Parse_KeyLine } from './key-line.ts';
import { Yaml_Read_Indent } from './utils.ts';
import type {
  DocumentLike,
  OwnerKeyLine,
  Selection,
  ValueContextKind,
  ValueContextResult,
} from './yaml-inline.types.ts';

export class Yaml_Find_OwnerKeyLine {
  static find(doc: DocumentLike, lineIdx: number): OwnerKeyLine | null {
    const targetIndent = Yaml_Read_Indent.get(doc.lineAt(lineIdx).text);
    for (let i = lineIdx; i >= 0; i--) {
      const text = doc.lineAt(i).text;
      if (!text.trim()) continue;
      if (text.trimStart().startsWith('#')) continue;

      const indent = Yaml_Read_Indent.get(text);
      const keyLine = Yaml_Parse_KeyLine.parse(text);

      if (i === lineIdx) {
        if (keyLine) return { line: i, indent, keyLine };
        continue;
      }

      if (keyLine && keyLine.keyStartCol < targetIndent) {
        return { line: i, indent, keyLine };
      }
    }
    return null;
  }
}

export class Yaml_Analyze_ValueContext {
  static analyze(doc: DocumentLike, selection: Selection): ValueContextResult {
    const { start, end } = selection;

    // --- одна строка ---
    if (start.line === end.line) {
      const text = doc.lineAt(start.line).text;
      if (!text.trim()) return fail('empty_line', 'Пустая строка');
      if (text.trimStart().startsWith('#')) return fail('comment_line', 'Строка-комментарий');

      const keyLine = Yaml_Parse_KeyLine.parse(text);
      if (keyLine && !keyLine.isBlockScalar) {
        if (end.character <= keyLine.valueStartCol) {
          return fail('selection_before_value', 'Выделение левее значения');
        }
        if (start.character < keyLine.valueStartCol) {
          return fail('selection_crosses_key_value', 'Выделение пересекает границу «ключ: значение»');
        }
        const indent = Yaml_Read_Indent.get(text);
        return ok('inline', { line: start.line, indent, keyLine });
      }
      if (keyLine && keyLine.isBlockScalar) {
        return fail('on_block_scalar_indicator', 'Выделение на индикаторе блочного скаляра');
      }

      const owner = Yaml_Find_OwnerKeyLine.find(doc, start.line);
      if (!owner || !owner.keyLine.isBlockScalar) {
        return fail('not_a_value_line', 'Строка не является значением YAML');
      }
      return ok('block-scalar', owner);
    }

    // --- multi-line ---
    const lastContentLine = end.character === 0 && end.line > start.line ? end.line - 1 : end.line;

    for (let i = start.line; i <= lastContentLine; i++) {
      const text = doc.lineAt(i).text;
      if (!text.trim()) continue;
      if (text.trimStart().startsWith('#')) continue;
      if (Yaml_Parse_KeyLine.parse(text)) {
        return fail('structural_in_selection', 'Выделение содержит структурную YAML-строку');
      }
    }

    const startOwner = Yaml_Find_OwnerKeyLine.find(doc, start.line);
    if (!startOwner || !startOwner.keyLine.isBlockScalar) {
      return fail('multi_line_not_block_scalar', 'Многострочное выделение вне блочного скаляра');
    }
    const endOwner = Yaml_Find_OwnerKeyLine.find(doc, lastContentLine);
    if (!endOwner || endOwner.line !== startOwner.line) {
      return fail('multi_line_spans_owners', 'Выделение захватывает несколько YAML-узлов');
    }

    return ok('block-scalar', startOwner);
  }
}

function ok(kind: ValueContextKind, owner: OwnerKeyLine | null): ValueContextResult {
  return { ok: true, kind, owner };
}

function fail(reasonCode: ValueContextResult extends infer _ ? Exclude<ValueContextResult, { ok: true }>['reasonCode'] : never, reason: string): ValueContextResult {
  return { ok: false, reasonCode, reason };
}