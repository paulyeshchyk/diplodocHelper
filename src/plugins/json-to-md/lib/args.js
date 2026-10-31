'use strict';

function parseArgs(argv) {
  const out = {
    jsonPath: null,
    outputDir: null,
    outputFile: null,
    schema: 'known-issues',
    tableType: 'extended',

    // treemap
    xField: 'module',
    yField: 'layer',
    labelField: 'id',
    valueField: null,
    valueAgg: 'count',
    classField: null,
    flat: false,

    // grouped
    groupBy: null,
    groupFooter: true,
    groupSplit: undefined,      // undefined → берём из schema.multi
    groupSeparator: undefined,  // undefined → берём из schema.separator || ','
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--flat') { out.flat = true; continue; }
    if (a === '--groupSplit') { out.groupSplit = true; continue; }
    if (a === '--no-groupSplit') { out.groupSplit = false; continue; }
    if (a === '--no-groupFooter') { out.groupFooter = false; continue; }

    if (!a.startsWith('--')) { positional.push(a); continue; }

    const eq = a.indexOf('=');
    let key, val;
    if (eq !== -1) { key = a.slice(0, eq); val = a.slice(eq + 1); }
    else { key = a; val = argv[++i]; }

    switch (key) {
      case '--jsonPath': out.jsonPath = val; break;
      case '--outputDir': out.outputDir = val; break;
      case '--outputFile': out.outputFile = val; break;
      case '--schema': out.schema = val; break;
      case '--tableType': out.tableType = val; break;
      case '--xField': out.xField = val; break;
      case '--yField': out.yField = val; break;
      case '--labelField': out.labelField = val; break;
      case '--valueField': out.valueField = val || null; break;
      case '--valueAgg': out.valueAgg = val; break;
      case '--classField': out.classField = val || null; break;
      case '--groupBy': out.groupBy = val || null; break;
      case '--groupSeparator': out.groupSeparator = val || undefined; break;
      case '--groupFooter':
        out.groupFooter = !(val === 'false' || val === '0' || val === 'no');
        break;
    }
  }

  if (!out.jsonPath) out.jsonPath = positional[0] || './known-issues-summary.json';
  if (!out.outputDir) out.outputDir = positional[1] || './docs';
  if (positional[2]) out.tableType = positional[2];
  return out;
}

module.exports = { parseArgs };