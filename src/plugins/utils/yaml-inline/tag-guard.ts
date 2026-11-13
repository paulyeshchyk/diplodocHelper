// src/plugins/utils/yaml-inline/tag-guard.ts

import type { TagGuardResult } from './yaml-inline.types.ts';

const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'param', 'source', 'track', 'wbr',
]);

export class Yaml_Guard_TagBalance {
  static isInsideTag(text: string, offset: number): boolean {
    let inTag = false;
    let quote: string | null = null;
    for (let i = 0; i < offset; i++) {
      const c = text[i];
      if (inTag) {
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '>') {
          inTag = false;
        }
      } else if (c === '<') {
        inTag = true;
      }
    }
    return inTag;
  }

  static hasUnbalancedTags(fragment: string): boolean {
    const stack: string[] = [];
    const re = /<\/?([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fragment)) !== null) {
      const name = m[1].toLowerCase();
      const isClosing = m[0][1] === '/';
      const isSelfClose = m[2] === '/';
      if (VOID_ELEMENTS.has(name) || isSelfClose) continue;
      if (isClosing) {
        if (stack.length === 0 || stack.pop() !== name) return true;
      } else {
        stack.push(name);
      }
    }
    return stack.length > 0;
  }

  static guard(
    fullText: string,
    fragment: string,
    startOffset: number,
    endOffset: number,
  ): TagGuardResult {
    if (Yaml_Guard_TagBalance.isInsideTag(fullText, startOffset)) {
      return { ok: false, reasonCode: 'starts_inside_tag', reason: 'Выделение начинается внутри тега' };
    }
    if (Yaml_Guard_TagBalance.isInsideTag(fullText, endOffset)) {
      return { ok: false, reasonCode: 'ends_inside_tag', reason: 'Выделение заканчивается внутри тега' };
    }
    if (Yaml_Guard_TagBalance.hasUnbalancedTags(fragment)) {
      return { ok: false, reasonCode: 'unbalanced_tags', reason: 'Выделение содержит незакрытый тег' };
    }
    return { ok: true };
  }
}