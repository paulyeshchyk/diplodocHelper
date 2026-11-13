// src/plugins/utils/yaml-inline/toggle-format.types.ts

import type { InlineToken } from '../html/Html_Tokenize_Inline.types.ts';
import type { FormatKey } from './format-detect.types.ts';

export type ToggleAction = 'wrapped' | 'unwrapped' | 'noop';

export interface ToggleEdit {
  /** offset в исходном тексте (включительно) */
  readonly offset: number;
  /** длина заменяемого фрагмента (0 = вставка) */
  readonly length: number;
  readonly replacement: string;
}

export interface ToggleResult {
  /** итоговый текст документа */
  readonly text: string;
  /** новая selection: [newStart, newEnd) */
  readonly newStart: number;
  readonly newEnd: number;
  readonly action: ToggleAction;
  /**
   * primitive edits **в порядке применения с конца** — так, чтобы
   * следующий edit не сдвигал offset предыдущего. Пусто при `noop`.
   */
  readonly edits: ReadonlyArray<ToggleEdit>;
}

export interface WrappingPair {
  readonly key: FormatKey;
  readonly open: InlineToken;
  readonly close: InlineToken;
}