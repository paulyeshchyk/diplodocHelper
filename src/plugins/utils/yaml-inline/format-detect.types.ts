// src/plugins/utils/yaml-inline/format-detect.types.ts

export type FormatKey = 'bold' | 'italic' | 'mono';

export type FormatFlags = Readonly<Record<FormatKey, boolean>>;