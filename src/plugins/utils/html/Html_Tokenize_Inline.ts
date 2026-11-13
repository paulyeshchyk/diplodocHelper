// src/utils/html/Html_Tokenize_Inline.ts

import type { InlineToken } from './Html_Tokenize_Inline.types.ts';

const VOID_TAGS: ReadonlySet<string> = new Set([
  'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'param', 'source', 'track', 'wbr',
]);

const TAG_NAME_RE = /[a-z][a-z0-9-]*/iy;
const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';

export class Html_Tokenize_Inline {
  static tokenize(text: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    let i = 0;
    let textStart = 0;

    const flushText = (until: number): void => {
      if (until > textStart) {
        tokens.push({
          type: 'text',
          start: textStart,
          end: until,
          raw: text.slice(textStart, until),
        });
      }
    };

    while (i < text.length) {
      // --- комментарии ---
      if (text.startsWith(COMMENT_OPEN, i)) {
        const close = text.indexOf(COMMENT_CLOSE, i + COMMENT_OPEN.length);
        const end = close === -1 ? text.length : close + COMMENT_CLOSE.length;
        flushText(i);
        tokens.push({ type: 'comment', start: i, end, raw: text.slice(i, end) });
        i = end;
        textStart = i;
        continue;
      }

      if (text[i] !== '<') {
        i++;
        continue;
      }

      // --- кандидат на тег ---
      const tagStart = i;
      const isClosing = text[i + 1] === '/';
      const nameStart = isClosing ? i + 2 : i + 1;

      TAG_NAME_RE.lastIndex = nameStart;
      const nameMatch = TAG_NAME_RE.exec(text);
      if (!nameMatch) {
        i++;
        continue;
      }

      const name = nameMatch[0].toLowerCase();
      const afterName = nameStart + nameMatch[0].length;

      const gt = Html_Tokenize_Inline._findClosingGt(text, afterName);
      if (gt === -1) {
        // незакрытый `<...` — весь остаток строки трактуем как текст
        break;
      }

      const raw = text.slice(tagStart, gt + 1);
      const selfClosing = /\/\s*>$/.test(raw);
      const type = isClosing
        ? 'close'
        : selfClosing || VOID_TAGS.has(name)
          ? 'void'
          : 'open';

      flushText(tagStart);
      tokens.push({ type, start: tagStart, end: gt + 1, raw, name });
      i = gt + 1;
      textStart = i;
    }

    flushText(text.length);
    return tokens;
  }

  static filterText(tokens: InlineToken[]): InlineToken[] {
    return tokens.filter(t => t.type === 'text');
  }

  /** `>` внутри `href="…"` / `title='…'` — не считается закрывающим. */
  private static _findClosingGt(text: string, from: number): number {
    let quote: string | null = null;
    for (let i = from; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        return i;
      }
    }
    return -1;
  }
}