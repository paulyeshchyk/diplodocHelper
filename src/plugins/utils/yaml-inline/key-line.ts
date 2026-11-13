// src/plugins/utils/yaml-inline/key-line.ts

import { Yaml_Read_UnquotedColon } from './utils.ts';
import type { ParsedKeyLine } from './yaml-inline.types.ts';

export class Yaml_Parse_KeyLine {
  static parse(lineText: string): ParsedKeyLine | null {
    if (!lineText.trim()) return null;
    if (lineText.trimStart().startsWith('#')) return null;

    const bulletMatch = lineText.match(/^(\s*)(-\s+)?/);
    const bulletLen = bulletMatch ? bulletMatch[0].length : 0;

    const colonCol = Yaml_Read_UnquotedColon.find(lineText, bulletLen);
    if (colonCol === -1) return null;

    const keyStartCol = bulletLen;
    if (lineText[keyStartCol] === undefined) return null;
    if (/\s/.test(lineText[keyStartCol])) return null;

    const afterColon = lineText.slice(colonCol + 1);

    // Блочный скаляр: `|` / `|-` / `|+` / `>` / `>-` / `>+`
    const blockMatch = afterColon.match(/^\s*([|>])([-+]?)\s*(#.*)?$/);
    if (blockMatch) {
      return {
        bulletLen,
        keyStartCol,
        colonCol,
        valueStartCol: -1,
        isBlockScalar: true,
      };
    }

    // Требуем пробел после `:` (иначе `key:value` — единый скаляр YAML)
    if (afterColon.length > 0 && afterColon[0] !== ' ') return null;

    let valueStartCol = colonCol + 1;
    while (valueStartCol < lineText.length && lineText[valueStartCol] === ' ') valueStartCol++;

    return {
      bulletLen,
      keyStartCol,
      colonCol,
      valueStartCol,
      isBlockScalar: false,
    };
  }
}