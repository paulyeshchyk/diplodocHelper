'use strict';

const fs = require('fs');

const { parseArgs } = require('./lib/args');
const { loadSchema, validateSchema } = require('./lib/schema');
const { resolveOutputPath, ensureParentDir } = require('./lib/paths');
const { generateExtendedTable } = require('./lib/generators/extended-table');
const { generateSimpleTable } = require('./lib/generators/simple-table');
const { generateGroupedTable } = require('./lib/generators/grouped-table');
const { generateTreemap, wrapMermaid } = require('./lib/generators/treemap');

/**
 * Главная точка входа.
 *
 *   1. Читает JSON.
 *   2. Загружает схему, валидирует обязательные поля (warn, не падает).
 *   3. Диспатчит на нужный генератор.
 *   4. Пишет результат в outputPath.
 *
 * @returns {{success: boolean, outputPath?: string, warnings?: Object}}
 */
function runGeneration(opts) {
  const {
    jsonPath, outputDir, outputFile, schema: schemaName = 'known-issues',
    tableType = 'extended',
    xField, yField, labelField, valueField, valueAgg, classField, flat,
    groupBy, groupFooter, groupSplit, groupSeparator,
  } = opts;

  console.log(`[json-to-md] Чтение JSON из: ${jsonPath}`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ [json-to-md] Файл не найден: ${jsonPath}`);
    return { success: false };
  }

  let issues;
  try {
    issues = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error(`❌ [json-to-md] Ошибка чтения/парсинга JSON: ${err.message}`);
    return { success: false };
  }

  if (!Array.isArray(issues)) {
    console.error(`❌ [json-to-md] Ожидался массив записей, получено: ${typeof issues}`);
    return { success: false };
  }

  const mode = String(tableType).toLowerCase();

  // Схема нужна всем режимам, кроме treemap
  let schema = null;
  let validation = { ok: true, missing: {} };
  if (mode !== 'treemap') {
    try {
      schema = loadSchema(schemaName);
    } catch (err) {
      console.error(`❌ [json-to-md] ${err.message}`);
      return { success: false };
    }
    validation = validateSchema(issues, schema, console);
  }

  let content, defaultFileName;
  if (mode === 'simple' || mode === 'standard') {
    content = generateSimpleTable(issues, { schema });
    defaultFileName = 'known-issues-simple.md';
  } else if (mode === 'treemap') {
    content = wrapMermaid(generateTreemap(issues, {
      xField, yField, labelField, valueField, valueAgg, classField, flat,
    }));
    defaultFileName = 'known-issues-treemap.md';
  } else if (groupBy) {
    content = generateGroupedTable(issues, {
      schema, groupBy, groupFooter, groupSplit, groupSeparator,
    });
    defaultFileName = `known-issues-by-${groupBy}.md`;
  } else {
    content = generateExtendedTable(issues, { schema });
    defaultFileName = 'known-issues-summary.md';
  }

  const outputPath = resolveOutputPath({ outputDir, outputFile, defaultFileName });
  ensureParentDir(outputPath);

  try {
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`✅ [json-to-md] Создан: ${outputPath} (режим: ${mode})`);
    return { success: true, outputPath, warnings: validation.missing };
  } catch (err) {
    console.error(`❌ [json-to-md] Ошибка записи: ${err.message}`);
    return { success: false };
  }
}

module.exports = {
  runGeneration,
  parseArgs,
  loadSchema,
  validateSchema,
  generateExtendedTable,
  generateSimpleTable,
  generateGroupedTable,
  generateTreemap,
  wrapMermaid,
};

if (require.main === module) {
  runGeneration(parseArgs(process.argv.slice(2)));
}