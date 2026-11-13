// src/utils/yaml/Yaml_Read_QuotedString.types.ts

export type QuoteChar = "'" | '"';

export interface QuotedStringInfo {
  readonly quoteChar: QuoteChar;
  /** offset открывающей кавычки (включительно) */
  readonly startOffset: number;
  /** offset после закрывающей кавычки (исключительно), либо длины строки при незакрытой */
  readonly endOffset: number;
  /** offset первого символа контента */
  readonly contentStart: number;
  /** offset закрывающей кавычки (исключительно), либо длины строки при незакрытой */
  readonly contentEnd: number;
  readonly closed: boolean;
}