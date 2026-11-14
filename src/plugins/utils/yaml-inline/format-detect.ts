// src/plugins/utils/yaml-inline/format-detect.ts

import { Html_Find_TagPairs } from '../html/Html_Find_TagPairs.ts';
import { Html_Tokenize_Inline } from '../html/Html_Tokenize_Inline.ts';
import type { InlineToken } from '../html/Html_Tokenize_Inline.types.ts';
import type { FormatFlags, FormatKey } from './format-detect.types.ts';

const ALIASES: Readonly<Record<FormatKey, ReadonlySet<string>>> = {
  bold: new Set(['b', 'strong']),
  italic: new Set(['i', 'em']),
  mono: new Set(['kbd', 'tt']),
};

export class Yaml_Detect_Format {
  static readonly aliases = ALIASES;

  static isWrappedBy(
    tokens: ReadonlyArray<InlineToken>,
    aliases: ReadonlySet<string>,
    start: number,
    end: number,
  ): boolean {
    for (const { open, close } of Html_Find_TagPairs.pairs(tokens, aliases)) {
      if (start >= open.end && end <= close.start) return true;
      if (start <= open.start && end >= close.end) return true;
    }
    return false;
  }

  static detect(text: string, start: number, end: number): FormatFlags {
    const tokens = Html_Tokenize_Inline.tokenize(text);
    return {
      bold: Yaml_Detect_Format.isWrappedBy(tokens, ALIASES.bold, start, end),
      italic: Yaml_Detect_Format.isWrappedBy(tokens, ALIASES.italic, start, end),
      mono: Yaml_Detect_Format.isWrappedBy(tokens, ALIASES.mono, start, end),
    };
  }
}