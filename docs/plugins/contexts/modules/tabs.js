// modules/tabs.js

/**
 * Генерирует Markdown-разметку для вкладок
 * @param {Object} params
 * @param {Array<{title: string, content: string}>} params.tabs - массив вкладок
 * @param {number} [params.selectedIndex=0] - индекс выбранной вкладки (0-based)
 * @returns {string} Строка с табами
 */
function generateTabsMarkup({ tabs, selectedIndex = 0 }) {
  if (!tabs || tabs.length === 0) return '';

  const lines = ['{% list tabs %}'];

  tabs.forEach((tab, index) => {
    const selectedAttr = index === selectedIndex ? '{selected}' : '';
    lines.push(`- ${tab.title}${selectedAttr}`);
    lines.push('');
    const indentedContent = tab.content.split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    lines.push(indentedContent);
    lines.push('');
  });

  lines.push('{% endlist %}');
  return lines.join('\n');
}

module.exports = { generateTabsMarkup };