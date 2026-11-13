// src/plugins/utils/yaml-inline/value-range.types.ts

import type { Position } from './yaml-inline.types.ts';

export interface ValueRange {
  readonly start: Position;
  readonly end: Position;
}