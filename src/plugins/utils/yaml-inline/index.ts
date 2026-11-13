// src/plugins/utils/yaml-inline/index.ts

import { Yaml_Guard_TagBalance } from './tag-guard.ts';
import { Yaml_Analyze_ValueContext } from './value-context.ts';
import type {
  AnalysisResult,
  DocumentLike,
  Selection,
} from './yaml-inline.types.ts';

export class Yaml_Analyze_Selection {
  static analyze(doc: DocumentLike, selection: Selection): AnalysisResult {
    const value = Yaml_Analyze_ValueContext.analyze(doc, selection);
    if (!value.ok) return value;

    const text = doc.getText();
    const fragment = doc.getText(selection);
    const startOffset = doc.offsetAt(selection.start);
    const endOffset = doc.offsetAt(selection.end);

    const tag = Yaml_Guard_TagBalance.guard(text, fragment, startOffset, endOffset);
    if (!tag.ok) return tag;

    return { ok: true, kind: value.kind, owner: value.owner };
  }
}

export type {
  AnalysisFail,
  AnalysisOk,
  AnalysisResult,
  DocumentLike,
  FailCode,
  OwnerKeyLine,
  ParsedKeyLine,
  Position,
  Selection,
  TagGuardResult,
  ValueContextKind,
  ValueContextResult
} from './yaml-inline.types.ts';

export { Yaml_Read_ValueRange } from './value-range.ts';
export type { ValueRange } from './value-range.types.ts';
