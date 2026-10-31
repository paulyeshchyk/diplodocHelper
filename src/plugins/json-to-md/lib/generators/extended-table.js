'use strict';

const { escMd } = require('../escape');
const { getColumns } = require('../schema');
const DEFAULT_SCHEMA = require('../../schemas/known-issues.schema.js');

/**
 * Расширенная Diplodoc-таблица (#|| … ||#).
 * Колонки и заголовки — из схемы.
 */
function generateExtendedTable(issues, opts = {}) {
  const schema = opts.schema || DEFAULT_SCHEMA;
  if (!issues || issues.length === 0) return 'Нет данных для отображения.';

  const columns = getColumns(schema);
  let result = '#|\n';
  result += '|| ' + columns.map(c => `**${c.label}**`).join(' | ') + ' ||\n';

  for (const issue of issues) {
    const cells = columns.map(col => {
      if (col.isDetails) {
        const raw = issue[col.key];
        return raw && String(raw).trim()
          ? `{% cut "Развернуть" %}\n\n${escMd(String(raw).trim())}\n\n{% endcut %}`
          : '—';
      }
      return escMd(issue[col.key]);
    });
    result += '||\n' + cells.join('\n|\n') + '\n||\n';
  }
  return result + '|#\n';
}

module.exports = { generateExtendedTable };