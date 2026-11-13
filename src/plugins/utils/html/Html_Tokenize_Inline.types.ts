// src/utils/html/Html_Tokenize_Inline.types.ts

export type InlineTokenType = 'text' | 'open' | 'close' | 'void' | 'comment';

export interface InlineToken {
  readonly type: InlineTokenType;
  /** offset в исходной строке (включительно) */
  readonly start: number;
  /** offset в исходной строке (исключительно) */
  readonly end: number;
  /** исходный фрагмент — text, весь тег или <!-- ... --> */
  readonly raw: string;
  /** имя тега в lowercase для open/close/void; отсутствует для text/comment */
  readonly name?: string;
}