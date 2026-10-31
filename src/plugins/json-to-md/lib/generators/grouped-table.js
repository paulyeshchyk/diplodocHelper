'use strict';

const { escMd, splitTopLevel } = require('../escape');
const { getColumns } = require('../schema');
const DEFAULT_SCHEMA = require('../../schemas/known-issues.schema.js');

/**
 * Extended-таблица с группировкой по одному полю.
 * Колонка groupBy исключается; между группами — объединённые строки
 * заголовка и подвала через `>` + `{.cell-align-top-left}`.
 *
 * Если поле помечено `multi: true`, значение автоматически разбивается
 * по separator — одна запись попадает в несколько групп.
 */
function generateGroupedTable(issues, opts = {}) {
  const {
    schema = DEFAULT_SCHEMA,
    groupBy = 'severity',
    groupFooter = true,
    groupSplit,
    groupSeparator,
  } = opts;

  if (!issues || issues.length === 0) return 'Нет данных для отображения.';

  const fieldDef = schema.fields[groupBy];
  if (!fieldDef) {
    throw new Error(`generateGroupedTable: поле "${groupBy}" отсутствует в схеме`);
  }

  const effectiveSplit = groupSplit !== undefined
    ? groupSplit
    : Boolean(fieldDef.multi);
  const effectiveSep = groupSeparator || fieldDef.separator || ',';
  const sepChars = [effectiveSep];

  const groups = new Map();
  for (const issue of issues) {
    const raw = issue[groupBy];
    const values = (effectiveSplit && raw != null)
      ? splitTopLevel(String(raw), sepChars)
      : [String(raw ?? '—')];

    for (const key of (values.length ? values : ['—'])) {
      if (!groups.has(key)) groups.set(key, []);
      if (!groups.get(key).includes(issue)) groups.get(key).push(issue);
    }
  }

  const columns = getColumns(schema, [groupBy]);
  const colCount = columns.length;

  const fullWidthRow = (content) => {
    const firstCell = `${content} {.cell-align-top-left}`;
    const mergeMarkers = Array(Math.max(0, colCount - 1)).fill('>');
    return '|| ' + [firstCell, ...mergeMarkers].join(' | ') + ' ||\n';
  };

  let result = '#|\n';
  result += '|| ' + columns.map(c => `**${c.label}**`).join(' | ') + ' ||\n';

  for (const [groupValue, items] of groups) {
    result += fullWidthRow(`<br>**${escMd(fieldDef.label)}: ${escMd(groupValue)}**`);

    for (const issue of items) {
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

    if (groupFooter) {
      result += fullWidthRow(`_Всего для ${escMd(groupValue)}: **${items.length}**_ <br><br>`);
    }
  }

  result += '|#\n';
  return result;
}

module.exports = { generateGroupedTable };