'use strict';

const escMd = (s) => String(s ?? '—').replace(/\|/g, '&#124;');
const escMdLine = (s) => escMd(s).replace(/\r?\n/g, ' ');
const escMermaid = (s) =>
  String(s ?? '—').replace(/"/g, '&quot;').replace(/\r?\n/g, ' ').trim();

/**
 * Режет строку по разделителям верхнего уровня.
 * Не трогает содержимое `[] () {}` — `[text](url,with,commas)` остаётся одним элементом.
 */
function splitTopLevel(str, separatorChars = [',', ';']) {
  const result = [];
  let depth = 0;
  let current = '';
  for (const c of String(str)) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);

    if (depth === 0 && separatorChars.includes(c)) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

module.exports = { escMd, escMdLine, escMermaid, splitTopLevel };