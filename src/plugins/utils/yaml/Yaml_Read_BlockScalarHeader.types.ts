// src/utils/yaml/Yaml_Read_BlockScalarHeader.types.ts

export type BlockScalarStyle = 'literal' | 'folded';
export type BlockScalarChomping = 'clip' | 'strip' | 'keep';

export interface BlockScalarHeader {
  /** `|` → literal, `>` → folded */
  readonly style: BlockScalarStyle;
  /** отсутствие индикатора → clip, `-` → strip, `+` → keep */
  readonly chomping: BlockScalarChomping;
  /** текст после `#` (без `#` и пробелов), либо null */
  readonly comment: string | null;
  /** исходный `afterColon` как пришёл */
  readonly raw: string;
}