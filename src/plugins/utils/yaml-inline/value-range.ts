// src/plugins/utils/yaml-inline/value-range.ts

import { Yaml_Read_QuotedString } from '../yaml/Yaml_Read_QuotedString.ts';
import type { ValueRange } from './value-range.types.ts';
import type {
  DocumentLike,
  OwnerKeyLine,
  Selection,
  ValueContextKind,
} from './yaml-inline.types.ts';

export class Yaml_Read_ValueRange {
  /**
   * Возвращает contentRange — «минимальный разумный контент value,
   * который покрывает selection». Синтаксис YAML (`'…'`, `"…"`,
   * `|`, `#comment`, trailing spaces) в contentRange не входит.
   *
   * Для block-scalar contentRange = selection (guard уже проверил,
   * что selection внутри контента).
   */
  static read(
    doc: DocumentLike,
    selection: Selection,
    kind: ValueContextKind,
    owner: OwnerKeyLine | null,
  ): ValueRange {
    const fallback: ValueRange = { start: selection.start, end: selection.end };

    if (kind === 'block-scalar') return fallback;
    if (!owner) return fallback;

    const { valueStartCol, isBlockScalar } = owner.keyLine;
    if (isBlockScalar || valueStartCol === -1) return fallback;

    const lineText = doc.lineAt(owner.line).text;
    const content = Yaml_Read_ValueRange._contentCols(lineText, valueStartCol);

    const rangeStartCol = Math.max(selection.start.character, content.startCol);
    const rangeEndCol = Math.min(selection.end.character, content.endCol);
    if (rangeStartCol > rangeEndCol) return fallback;

    return {
      start: { line: owner.line, character: rangeStartCol },
      end: { line: owner.line, character: rangeEndCol },
    };
  }

  private static _contentCols(
    lineText: string,
    valueStartCol: number,
  ): { startCol: number; endCol: number } {
    const first = lineText[valueStartCol];

    if (first === "'" || first === '"') {
      const quoted = Yaml_Read_QuotedString.read(lineText, valueStartCol);
      if (quoted) {
        const endCol = quoted.closed ? quoted.contentEnd : lineText.length;
        return { startCol: quoted.contentStart, endCol };
      }
    }

    return {
      startCol: valueStartCol,
      endCol: Yaml_Read_ValueRange._plainValueEnd(lineText, valueStartCol),
    };
  }

  /**
   * Конец plain-scalar: до `#comment` (если `#` на старте или после
   * пробела), затем обрезаем trailing spaces.
   */
  private static _plainValueEnd(lineText: string, from: number): number {
    let end = lineText.length;
    for (let i = from; i < lineText.length; i++) {
      if (lineText[i] === '#' && (i === from || lineText[i - 1] === ' ')) {
        end = i;
        break;
      }
    }
    while (end > from && lineText[end - 1] === ' ') end--;
    return end;
  }
}