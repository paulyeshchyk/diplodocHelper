// =============================================================================
// TODO[refactor:sanitize-phases]: см. план фаз A/B/C.
// Эта итерация — quick-win: Sanitizer + patches для gost/term/abbr.
// Запланированные фазы (полный план — в переписке):
//   Phase 0: utils (HtmlEscaper, HtmlSanitizer, TextExtractor, TooltipBuilder, ...)
//   Phase A: abbr/term/gost — унификация (замена escapeHtml, TooltipBuilder, ...)
//   Phase B: contexts/contentNavigator — унификация + XSS-фиксы
//   Phase C: figures + прочие модули
// =============================================================================

'use strict';

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'code', 'b', 'i', 'em', 'strong', 'span',
  'br', 'sub', 'sup', 'mark', 'kbd', 'small',
]);

const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'role', 'tabindex', 'lang']);
const TAG_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'name']),
};

const ALLOWED_PROTOCOLS = /^(?:https?|mailto|tel):/i;

const DANGEROUS_BLOCK_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'link', 'meta', 'base',
];

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
// Символы, опасные в YAML/HTML-индикаторах. Заменяются пробелом.
const DANGEROUS_CHARS = /[<>'"&*!|%@`]/g;

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ',
};

function decodeEntities(s) {
  return s.replace(/&(?:#x?[0-9a-f]+|[a-z]+);/gi, m => ENTITIES[m.toLowerCase()] ?? m);
}

function escapeAttrValue(v) {
  return decodeEntities(String(v))
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isSafeUrl(url) {
  const t = String(url).trim();
  if (!t) return false;
  if (t.startsWith('#') || t.startsWith('/') || t.startsWith('./') || t.startsWith('../')) return true;
  return ALLOWED_PROTOCOLS.test(t);
}

function cleanAttributes(tag, attrsStr) {
  const tagAttrs = TAG_ATTRS[tag] || new Set();
  const re = /([a-z_:][a-z0-9_:.\-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
  const kept = [];
  let m;
  while ((m = re.exec(attrsStr)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    const allowed =
      GLOBAL_ATTRS.has(name) ||
      tagAttrs.has(name) ||
      name.startsWith('data-') ||
      name.startsWith('aria-');
    if (!allowed) continue;
    if ((name === 'href' || name === 'src') && !isSafeUrl(value)) continue;
    kept.push(`${name}="${escapeAttrValue(value)}"`);
  }
  return kept.length ? ' ' + kept.join(' ') : '';
}

/**
 * Утилиты очистки текста/HTML.
 * Специализированный простейший санитайзер для справочников
 * gost / term / abbr. Не является универсальным — см. TODO выше.
 */
class Sanitizer {
  /**
   * Убрать ВСЕ HTML-тэги и оставить только буквы/цифры/пунктуацию
   * без YAML-опасных индикаторов. Для identity-полей:
   *   gost: code, type, date, status
   *   term: term, category
   *   abbr: abbr, category
   *
   * @param {unknown} value
   * @returns {string}
   */
  static stripTags(value) {
    if (value == null) return '';
    let s = String(value);
    s = s.replace(/<[^>]*>/g, '');      // 1. выкинуть сами тэги
    s = decodeEntities(s);               // 2. раскрыть оставшиеся entities
    s = s.replace(CONTROL_CHARS, '');    // 3. control-символы
    s = s.replace(DANGEROUS_CHARS, ' '); // 4. YAML/HTML-индикаторы -> пробел
    s = s.replace(/\s+/g, ' ').trim();   // 5. схлопнуть whitespace
    return s;
  }

  /**
   * Убрать ЗАПРЕЩЁННЫЕ тэги/атрибуты, оставить разрешённые
   * (a, abbr, code, b, i, em, strong, span, br, sub, sup, mark, kbd, small).
   * Для полей «доверенный авторский HTML»:
   *   gost: title, description
   *   term: definition, description
   *   abbr: full, description
   *
   * @param {unknown} value
   * @returns {string}
   */
  static sanitizeHtml(value) {
    if (value == null) return '';
    let s = String(value);

    // 1. Опасные блочные тэги — вместе с содержимым
    for (const tag of DANGEROUS_BLOCK_TAGS) {
      s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
      s = s.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
    }

    // 2. Все остальные тэги — по whitelist
    s = s.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tagName, attrsStr) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return ''; // тэг выкинуть, содержимое — оставить
      if (match.startsWith('</')) return `</${tag}>`;

      const selfClose = /\/\s*$/.test(attrsStr);
      const attrs = cleanAttributes(tag, attrsStr.replace(/\/\s*$/, ''));
      return `<${tag}${attrs}${selfClose ? ' /' : ''}>`;
    });

    return s;
  }
}

module.exports = { Sanitizer };
