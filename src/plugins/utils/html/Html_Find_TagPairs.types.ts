// src/utils/html/Html_Find_TagPairs.types.ts

import type { InlineToken } from './Html_Tokenize_Inline.types.ts';

export interface HtmlTagPair {
  readonly open: InlineToken;
  readonly close: InlineToken;
}