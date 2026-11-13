// src/plugins/utils/yaml-inline/toggle-format.ts

import { Html_Find_TagPairs } from '../html/Html_Find_TagPairs.ts';
import { Html_Tokenize_Inline } from '../html/Html_Tokenize_Inline.ts';
import { Yaml_Detect_Format } from './format-detect.ts';
import type { FormatKey } from './format-detect.types.ts';
import type {
  ToggleEdit,
  ToggleResult,
  WrappingPair,
} from './toggle-format.types.ts';

const CANONICAL_TAG: Readonly<Record<FormatKey, string>> = {
  bold: 'b',
  italic: 'i',
  mono: 'tt',
};

export class Yaml_Toggle_Format {
  static canonicalTag(key: FormatKey): string {
    return CANONICAL_TAG[key];
  }

  /**
   * Найти **реально существующую** пару тегов, которая удовлетворяет
   * одному из двух сценариев (A: selection внутри; B: selection снаружи).
   * Возвращается первая (самая внутренняя) — та же, что активирует
   * `isWrappedBy`. Именно её `open.name` нужно удалять при unwrap,
   * чтобы `<strong>` снялся как `<strong>`, а не `<b>`.
   */
  static findWrappingPair(
    text: string,
    start: number,
    end: number,
    key: FormatKey,
  ): WrappingPair | null {
    const tokens = Html_Tokenize_Inline.tokenize(text);
    const aliases = Yaml_Detect_Format.aliases[key];
    for (const { open, close } of Html_Find_TagPairs.pairs(tokens, aliases)) {
      if (start >= open.end && end <= close.start) return { key, open, close };
      if (start <= open.start && end >= close.end) return { key, open, close };
    }
    return null;
  }

  /**
   * Действие toggle: unwrap если уже обёрнуто; wrap если нет;
   * noop при пустом selection без обёртки.
   */
  static toggle(
    text: string,
    start: number,
    end: number,
    key: FormatKey,
  ): ToggleResult {
    const pair = Yaml_Toggle_Format.findWrappingPair(text, start, end, key);
    if (pair) return Yaml_Toggle_Format._applyUnwrap(text, start, end, pair);
    if (start === end) return Yaml_Toggle_Format._noop(text, start, end);
    return Yaml_Toggle_Format.wrap(text, start, end, key);
  }

  static wrap(
    text: string,
    start: number,
    end: number,
    key: FormatKey,
  ): ToggleResult {
    const tag = CANONICAL_TAG[key];
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    const openLen = openTag.length;

    const newText =
      text.slice(0, start) +
      openTag +
      text.slice(start, end) +
      closeTag +
      text.slice(end);

    // edits с конца: сначала close (дальше), потом open (ближе)
    const edits: ToggleEdit[] = [
      { offset: end, length: 0, replacement: closeTag },
      { offset: start, length: 0, replacement: openTag },
    ];

    return {
      text: newText,
      newStart: start + openLen,
      newEnd: end + openLen,
      action: 'wrapped',
      edits,
    };
  }

  private static _applyUnwrap(
    text: string,
    start: number,
    end: number,
    pair: WrappingPair,
  ): ToggleResult {
    const { open, close } = pair;
    const openLen = open.end - open.start;
    const closeLen = close.end - close.start;

    const newText =
      text.slice(0, open.start) +
      text.slice(open.end, close.start) +
      text.slice(close.end);

    // восстановление selection
    let newStart: number;
    let newEnd: number;
    if (start >= open.end && end <= close.start) {
      // сценарий A: сдвиг на openLen влево
      newStart = start - openLen;
      newEnd = end - openLen;
    } else {
      // сценарий B: selection обнимал всё → выделяем контент
      newStart = open.start;
      newEnd = close.start - openLen;
    }

    // edits с конца: сначала close, потом open
    const edits: ToggleEdit[] = [
      { offset: close.start, length: closeLen, replacement: '' },
      { offset: open.start, length: openLen, replacement: '' },
    ];

    return { text: newText, newStart, newEnd, action: 'unwrapped', edits };
  }

  private static _noop(text: string, start: number, end: number): ToggleResult {
    return { text, newStart: start, newEnd: end, action: 'noop', edits: [] };
  }
}