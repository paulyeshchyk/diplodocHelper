// src/utils/yaml/Yaml_Read_QuotedString.ts

import type { QuoteChar, QuotedStringInfo } from './Yaml_Read_QuotedString.types.ts';

export class Yaml_Read_QuotedString {
  static read(text: string, fromOffset: number): QuotedStringInfo | null {
    const quoteChar = text[fromOffset];
    if (quoteChar !== "'" && quoteChar !== '"') return null;

    const quote = quoteChar as QuoteChar;
    const startOffset = fromOffset;
    const contentStart = fromOffset + 1;

    const result = quote === "'"
      ? Yaml_Read_QuotedString._readSingle(text, startOffset, contentStart)
      : Yaml_Read_QuotedString._readDouble(text, startOffset, contentStart);

    return {
      quoteChar: quote,
      startOffset,
      contentStart,
      endOffset: result.endOffset,
      contentEnd: result.contentEnd,
      closed: result.closed,
    };
  }

  /** YAML single-quote: `''` — escaped одинарная, `\` — литерал. */
  private static _readSingle(text: string, startOffset: number, contentStart: number) {
    let i = contentStart;
    while (i < text.length) {
      if (text[i] === "'") {
        if (text[i + 1] === "'") {
          i += 2;
          continue;
        }
        return { endOffset: i + 1, contentEnd: i, closed: true };
      }
      i++;
    }
    return { endOffset: text.length, contentEnd: text.length, closed: false };
  }

  /** YAML double-quote: `\"` — escaped кавычка, `\\` — escaped backslash. */
  private static _readDouble(text: string, startOffset: number, contentStart: number) {
    let i = contentStart;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i] === '"') {
        return { endOffset: i + 1, contentEnd: i, closed: true };
      }
      i++;
    }
    return { endOffset: text.length, contentEnd: text.length, closed: false };
  }
}