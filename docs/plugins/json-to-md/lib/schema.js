'use strict';

const path = require('path');

/**
 * Загрузка схемы:
 *  - если передан объект — возвращаем как есть;
 *  - если строка с разделителем или расширением — require по пути;
 *  - иначе — из ./schemas/<name>.schema.js
 */
function loadSchema(nameOrSchema = 'known-issues') {
  if (typeof nameOrSchema === 'object' && nameOrSchema !== null) return nameOrSchema;

  const p = String(nameOrSchema);
  if (/[\\/]/.test(p) || p.endsWith('.js') || p.endsWith('.json')) {
    return require(path.resolve(p));
  }
  const schemaPath = path.resolve(__dirname, '..', 'schemas', `${p}.schema.js`);
  try {
    return require(schemaPath);
  } catch (err) {
    throw new Error(`Не удалось загрузить схему "${p}": ${err.message}`);
  }
}

/**
 * Проверка обязательных полей.
 * Возвращает { ok, missing: {fieldName: count} }.
 * Логирует предупреждения (не бросает).
 */
function validateSchema(items, schema, logger = console) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true, missing: {} };
  }
  const missing = {};
  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    if (!fieldDef.required) continue;
    let count = 0;
    for (const item of items) {
      if (item == null || item[fieldName] == null || item[fieldName] === '') count++;
    }
    if (count > 0) missing[fieldName] = count;
  }
  for (const [fieldName, count] of Object.entries(missing)) {
    logger.warn(
      `⚠️  [schema] Поле "${fieldName}" отсутствует в ${count} из ${items.length} записей`
    );
  }
  return { ok: Object.keys(missing).length === 0, missing };
}

/**
 * Список колонок в порядке columnOrder (или Object.keys), без exclude и hidden.
 */
function getColumns(schema, exclude = []) {
  const order = schema.columnOrder || Object.keys(schema.fields);
  return order
    .filter(name => !exclude.includes(name))
    .filter(name => !schema.fields[name].hidden)
    .map(name => ({ key: name, ...schema.fields[name] }));
}

module.exports = { loadSchema, validateSchema, getColumns };