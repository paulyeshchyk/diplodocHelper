// src/plugins/utils/yaml-inline/yaml-inline.types.ts

export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface Selection {
  readonly start: Position;
  readonly end: Position;
  readonly isEmpty: boolean;
}

/**
 * Минимальный интерфейс TextDocument, который использует guard.
 * vscode.TextDocument структурно совместим (Selection extends Range,
 * lineAt принимает number | Position). Намеренно не тащим `vscode`
 * в pure-логику (§1.5 Contributing).
 */
export interface DocumentLike {
  readonly lineCount: number;
  lineAt(line: number): { readonly text: string };
  getText(selection?: Selection): string;
  offsetAt(position: Position): number;
}

export type ValueContextKind = 'inline' | 'block-scalar';

export interface ParsedKeyLine {
  readonly bulletLen: number;
  readonly keyStartCol: number;
  readonly colonCol: number;
  /** -1 для блочного скаляра */
  readonly valueStartCol: number;
  readonly isBlockScalar: boolean;
}

export interface OwnerKeyLine {
  readonly line: number;
  readonly indent: number;
  readonly keyLine: ParsedKeyLine;
}

/** Единый код отказа для value-context и tag-guard. */
export type FailCode =
  // value-context
  | 'empty_line'
  | 'comment_line'
  | 'selection_before_value'
  | 'selection_crosses_key_value'
  | 'on_block_scalar_indicator'
  | 'not_a_value_line'
  | 'structural_in_selection'
  | 'multi_line_not_block_scalar'
  | 'multi_line_spans_owners'
  // tag-guard
  | 'starts_inside_tag'
  | 'ends_inside_tag'
  | 'unbalanced_tags';

export interface AnalysisFail {
  readonly ok: false;
  readonly reasonCode: FailCode;
  readonly reason: string;
}

export interface AnalysisOk {
  readonly ok: true;
  readonly kind: ValueContextKind;

  /**
   * key-line, к которому относится value.
   * - `inline`       — key-line самой строки;
   * - `block-scalar` — key-line владельца блока.
   * Потребитель (Yaml_Read_ValueRange) берёт `keyLine.valueStartCol` как старт value.
   */
  readonly owner: OwnerKeyLine | null;
}

export type ValueContextResult = AnalysisOk | AnalysisFail;
export type TagGuardResult = { readonly ok: true } | AnalysisFail;
export type AnalysisResult = AnalysisOk | AnalysisFail;