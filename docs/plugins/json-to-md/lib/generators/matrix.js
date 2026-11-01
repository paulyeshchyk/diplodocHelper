'use strict';

const { escMd } = require('../escape');

function sortEntries(map) {
  return [...map.entries()].sort((a, b) =>
    String(a[1].title).localeCompare(String(b[1].title), 'ru')
  );
}

function generateMatrix(items, opts = {}) {
  const {
    rowField = 'capabilities_arr',
    colField = 'families_arr',
    cellLabelField = 'treemapLabel',
    cellHrefField = 'id_href',
    emptyCell = '—',
    cellSeparator = '<br>',
    omitEmpty = 'both',   // 'none' | 'rows' | 'cols' | 'both'
  } = opts;

  if (!items || items.length === 0) return 'Нет данных для отображения.\n';

  // Собираем уникальные значения осей
  const rows = new Map();   // slug -> { title, link, cells: Map<colSlug, item[]> }
  const cols = new Map();   // slug -> { title, link }

  for (const item of items) {
    const rVals = item[rowField] || [];
    const cVals = item[colField] || [];
    for (const r of rVals) {
      if (!rows.has(r.slug)) rows.set(r.slug, { title: r.title, link: r.link, cells: new Map() });
    }
    for (const c of cVals) {
      if (!cols.has(c.slug)) cols.set(c.slug, { title: c.title, link: c.link });
    }
    for (const r of rVals) {
      for (const c of cVals) {
        const row = rows.get(r.slug);
        if (!row.cells.has(c.slug)) row.cells.set(c.slug, []);
        row.cells.get(c.slug).push(item);
      }
    }
  }

  const sortedRows = sortEntries(rows);
  const sortedCols = sortEntries(cols);

  // Отсев пустых (внутри — по количеству непустых ячеек)
  const isRowEmpty = (r) => [...r.cells.values()].every(v => v.length === 0);
  const isColEmpty = (cSlug) => sortedRows.every(([_, r]) => !r.cells.get(cSlug)?.length);

  const finalRows = (omitEmpty === 'rows' || omitEmpty === 'both')
    ? sortedRows.filter(([_, r]) => !isRowEmpty(r))
    : sortedRows;
  const finalCols = (omitEmpty === 'cols' || omitEmpty === 'both')
    ? sortedCols.filter(([slug]) => !isColEmpty(slug))
    : sortedCols;

  if (finalRows.length === 0 || finalCols.length === 0) {
    return 'Нет данных для отображения (все оси пусты).\n';
  }

  // Рендер
  const lines = [];
  lines.push('#|');
  // Шапка
  lines.push('|| **×** | ' + finalCols.map(([, c]) => `**${c.link}**`).join(' | ') + ' ||');
  // Строки
  for (const [rSlug, r] of finalRows) {
    const cells = [`**${r.link}**`];
    for (const [cSlug] of finalCols) {
      const list = r.cells.get(cSlug) || [];
      if (list.length === 0) {
        cells.push(emptyCell);
      } else {
        cells.push(list.map(it => {
          const label = escMd(it[cellLabelField] || it.id_plain || '');
          const href = it[cellHrefField] || '';
          return href ? `[${label}](${href})` : label;
        }).join(cellSeparator));
      }
    }
    lines.push('||');
    lines.push(cells.join('\n|\n'));
    lines.push('||');
  }
  lines.push('|#');
  return lines.join('\n') + '\n';
}

module.exports = { generateMatrix };