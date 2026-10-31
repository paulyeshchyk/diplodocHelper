'use strict';

const { escMdLine } = require('../escape');
const { getColumns } = require('../schema');
const DEFAULT_SCHEMA = require('../../schemas/known-issues.schema.js');

function generateSimpleTable(issues, opts = {}) {
  const schema = opts.schema || DEFAULT_SCHEMA;
  if (!issues || issues.length === 0) return 'Нет данных для отображения.';

  const columns = getColumns(schema);
  let result = '| ' + columns.map(c => c.label).join(' | ') + ' |\n';
  result += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

  for (const issue of issues) {
    const cells = columns.map(col => {
      const raw = issue[col.key];
      if (col.isDetails) {
        return raw && String(raw).trim()
          ? String(raw).trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
          : '—';
      }
      return escMdLine(raw ?? '—');
    });
    result += `| ${cells.join(' | ')} |\n`;
  }
  return result;
}

module.exports = { generateSimpleTable };