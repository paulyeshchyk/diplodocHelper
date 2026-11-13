// src/utils/yaml/Yaml_Read_BlockScalarHeader.ts

import type {
  BlockScalarChomping,
  BlockScalarHeader,
  BlockScalarStyle,
} from './Yaml_Read_BlockScalarHeader.types.ts';

const HEADER_RE = /^\s*([|>])([-+]?)\s*(#.*)?$/;

export class Yaml_Read_BlockScalarHeader {
  /**
   * Парсит «остаток строки после `key:`» — например:
   *   ` |-`            → literal + clip
   *   ` |+  # keep`    → literal + keep + comment
   *   ` >-`            → folded  + strip
   *   ` foo`           → null (не блочный скаляр)
   */
  static read(afterColon: string): BlockScalarHeader | null {
    const m = HEADER_RE.exec(afterColon);
    if (!m) return null;

    const indicator = m[1];
    const chompingToken = m[2];
    const commentRaw = m[3];

    const style: BlockScalarStyle = indicator === '|' ? 'literal' : 'folded';
    const chomping: BlockScalarChomping =
      chompingToken === '-' ? 'strip'
        : chompingToken === '+' ? 'keep'
          : 'clip';

    const comment = commentRaw
      ? (commentRaw.replace(/^#\s*/, '').trim() || null)
      : null;

    return { style, chomping, comment, raw: afterColon };
  }
}