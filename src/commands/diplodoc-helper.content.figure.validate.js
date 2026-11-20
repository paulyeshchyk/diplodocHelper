// src/commands/diplodoc-helper.content.figure.validate.js
'use strict';

/**
 * Заменяет содержимое fenced code blocks (``` и ~~~) пробелами той же длины,
 * чтобы сохранялись точные символьные смещения (offsets) в исходном тексте.
 * @param {string} text
 * @returns {string}
 */
function maskFencedCodeBlocks(text) {
  return text.replace(
    /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm,
    match => match.replace(/[^\n]/g, ' '),
  );
}

/**
 * Находит все блоки <figure>…</figure> в тексте (нежадно, с учётом вложенности нет —
 * figure в Diplodoc плоские).
 * @param {string} text
 * @returns {Array<{ start: number, end: number, body: string, incomplete: boolean }>}
 */
function findFigureBlocks(text) {
  const masked = maskFencedCodeBlocks(text);
  const blocks = [];
  const openRe = /<figure\b[^>]*>/gi;
  let m;

  while ((m = openRe.exec(masked)) !== null) {
    const openStart = m.index;
    const openEnd = openStart + m[0].length;
    const closeRe = /<\/figure\s*>/gi;
    closeRe.lastIndex = openEnd;
    const close = closeRe.exec(masked);

    if (!close) {
      blocks.push({
        start: openStart,
        end: text.length,
        body: text.slice(openStart),
        incomplete: true,
      });
      break;
    }

    const end = close.index + close[0].length;
    blocks.push({
      start: openStart,
      end,
      body: text.slice(openStart, end),
      incomplete: false,
    });
    openRe.lastIndex = end;
  }

  return blocks;
}

/**
 * Проверяет, что выделение [selStart, selEnd) не режет <figure> пополам.
 *
 * Правила:
 * 1. Любой figure, пересекающийся с выделением, должен лежать в нём целиком.
 * 2. В самом тексте выделения не должно быть «висячих» open/close.
 *
 * @param {string} fullText   — весь документ
 * @param {number} selStart   — offset начала выделения
 * @param {number} selEnd     — offset конца выделения
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function validateFigureIntegrity(fullText, selStart, selEnd) {
  const allBlocks = findFigureBlocks(fullText);

  for (const block of allBlocks) {
    if (block.incomplete) {
      const overlaps = block.start < selEnd && block.end > selStart;
      if (overlaps) {
        return {
          ok: false,
          reason: 'В документе найден незакрытый <figure>, пересекающийся с выделением.',
        };
      }
      continue;
    }

    const fullyInside = block.start >= selStart && block.end <= selEnd;
    const fullyOutside = block.end <= selStart || block.start >= selEnd;
    const partial = !fullyInside && !fullyOutside;

    if (partial) {
      return {
        ok: false,
        reason:
          'Выделение пересекает <figure> частично. ' +
          'Выделите блок целиком — от <figure> до </figure> включительно.',
      };
    }
  }

  // Доп. страховка с учётом маскирования code-блоков
  const maskedSelected = maskFencedCodeBlocks(fullText).slice(selStart, selEnd);
  const opens = (maskedSelected.match(/<figure\b[^>]*>/gi) || []).length;
  const closes = (maskedSelected.match(/<\/figure\s*>/gi) || []).length;
  if (opens !== closes) {
    return {
      ok: false,
      reason: `В выделении несбалансированы теги figure (открывающих: ${opens}, закрывающих: ${closes}).`,
    };
  }

  return { ok: true };
}

/**
 * Полные figure-блоки, целиком лежащие внутри выделения.
 * @param {string} fullText
 * @param {number} selStart
 * @param {number} selEnd
 */
function getFiguresFullyInside(fullText, selStart, selEnd) {
  return findFigureBlocks(fullText).filter(
    b => !b.incomplete && b.start >= selStart && b.end <= selEnd,
  );
}

module.exports = {
  findFigureBlocks,
  validateFigureIntegrity,
  getFiguresFullyInside,
};