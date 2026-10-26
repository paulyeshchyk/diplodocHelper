const PH_OPEN = String.fromCodePoint(0xe000);
const PH_CLOSE = String.fromCodePoint(0xe001);

/**
 * Маскирует code-спаны в Markdown (fenced, inline, <code>/<pre>),
 * чтобы их содержимое не участвовало в поиске тегов.
 * @param {string} text
 * @returns {string}
 */
function maskCodeInMarkdown(text) {
  let idx = 0;
  const mk = () => `${PH_OPEN}${idx++}${PH_CLOSE}`;

  let masked = text.replace(/(^|\n)(```|~~~)[\s\S]*?\2/g, () => mk());
  masked = masked.replace(/``[^`\n]+``|`[^`\n]+`/g, () => mk());
  masked = masked.replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, () => mk());
  return masked;
}

/**
 * Маскирует <code>/<pre>-блоки в HTML.
 * @param {string} html
 * @returns {{ masked: string, unmask: (s: string) => string }}
 */
function maskCodeBlocks(html) {
  const UNMASK_RE = new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, 'g');

  /** @type {{ ph: string, m: string }[]} */
  const placeholders = [];
  let idx = 0;
  const masked = html.replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, m => {
    const ph = `${PH_OPEN}${idx++}${PH_CLOSE}`;
    placeholders.push({ ph, m });
    return ph;
  });

  return {
    masked,
    unmask: s =>
      s.replace(UNMASK_RE, (_, i) => {
        const entry = placeholders[Number(i)];
        return entry ? entry.m : _;
      }),
  };
}

module.exports = { maskCodeInMarkdown, maskCodeBlocks, PH_OPEN, PH_CLOSE };