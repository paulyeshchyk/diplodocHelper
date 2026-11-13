// src/utils/html/Html_Find_TagPairs.ts

import type { HtmlTagPair } from './Html_Find_TagPairs.types.ts';
import type { InlineToken } from './Html_Tokenize_Inline.types.ts';

export class Html_Find_TagPairs {
  /**
   * Возвращает все пары `open/close` для тегов из `aliases`.
   * Порядок — по закрытию close-тега (внутренние раньше внешних).
   * Устойчиво к битой вложенности `<b><i></b></i>`: `</b>` находит
   * последний незакрытый `open(b)`, остальные пары независимы.
   */
  static pairs(
    tokens: ReadonlyArray<InlineToken>,
    aliases: ReadonlySet<string>,
  ): HtmlTagPair[] {
    const stack: InlineToken[] = [];
    const pairs: HtmlTagPair[] = [];
    for (const tok of tokens) {
      if (!tok.name || !aliases.has(tok.name)) continue;
      if (tok.type === 'open') {
        stack.push(tok);
      } else if (tok.type === 'close') {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === tok.name) {
            pairs.push({ open: stack[i], close: tok });
            stack.splice(i, 1);
            break;
          }
        }
      }
    }
    return pairs;
  }
}