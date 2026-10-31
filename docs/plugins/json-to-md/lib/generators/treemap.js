'use strict';

const { escMermaid } = require('../escape');

/**
 * Mermaid treemap-beta. Оси X/Y задаются явно через opts — схема не нужна.
 */
function generateTreemap(issues, opts = {}) {
  const {
    xField = 'module',
    yField = 'layer',
    labelField = 'id',
    valueField = null,
    valueAgg = 'count',
    classField = null,
    classDefs = [],
    flat = false,
  } = opts;

  if (!issues || issues.length === 0) return 'treemap-beta\n"Нет данных"\n';

  const tree = new Map();
  for (const issue of issues) {
    const y = issue[yField] ?? '—';
    const x = issue[xField] ?? '—';
    if (!tree.has(y)) tree.set(y, new Map());
    const xMap = tree.get(y);
    if (!xMap.has(x)) xMap.set(x, []);
    xMap.get(x).push(issue);
  }

  const classOf = (item) => {
    if (!classField) return '';
    const raw = item[classField];
    return raw == null ? '' : `:::${String(raw).replace(/[^\w-]/g, '_')}`;
  };

  let out = 'treemap-beta\n';

  for (const [y, xMap] of tree) {
    if (flat) {
      for (const [x, items] of xMap) {
        out += `"${escMermaid(y)} / ${escMermaid(x)}"\n`;
        for (const item of items) {
          const label = escMermaid(item[labelField] ?? '—');
          const value = valueField ? (Number(item[valueField]) || 1) : 1;
          out += `    "${label}": ${value}${classOf(item)}\n`;
        }
      }
    } else {
      out += `"${escMermaid(y)}"\n`;
      for (const [x, items] of xMap) {
        out += `    "${escMermaid(x)}"\n`;
        for (const item of items) {
          const label = escMermaid(item[labelField] ?? '—');
          const value = valueField ? (Number(item[valueField]) || 1) : 1;
          out += `        "${label}": ${value}${classOf(item)}\n`;
        }
      }
    }
  }

  if (classDefs.length > 0) {
    out += '\n';
    for (const def of classDefs) out += `classDef ${def.name} ${def.style};\n`;
  }
  return out;
}

function wrapMermaid(mermaidCode) {
  return '```mermaid\n' + mermaidCode.trimEnd() + '\n```\n';
}

module.exports = { generateTreemap, wrapMermaid };