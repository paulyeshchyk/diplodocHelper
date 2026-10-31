#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

// ---------- CLI ----------
const args = process.argv.slice(2);
const rootDir = args.find(a => !a.startsWith('-')) || '.';
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

// ---------- Поиск index.md ----------
async function findIndexFiles(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findIndexFiles(full, results);
    } else if (entry.isFile() && entry.name === 'index.md') {
      results.push(full);
    }
  }
  return results;
}

// ---------- Разбор frontmatter / body ----------
function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

// ---------- Разбор markdown-таблицы ----------
function parseTable(body) {
  // Находим начало первой таблицы (строка, начинающаяся с "|")
  let startIndex = -1;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '|' && (i === 0 || body[i - 1] === '\n')) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return null;

  // Собираем подряд идущие строки таблицы
  const lines = body.slice(startIndex).split(/\r?\n/);
  const tableLines = [];
  for (const line of lines) {
    if (line.trim().startsWith('|')) tableLines.push(line.trim());
    else break;
  }
  if (tableLines.length < 2) return null;

  const rows = tableLines.map(line => {
    const parts = line.split('|');
    return parts.slice(1, -1).map(cell => cell.trim());
  });

  const table = {};
  let headerSkipped = false;
  for (const row of rows) {
    if (row.length === 0) continue;
    // разделитель |---|---|
    const isSep = row.every(cell => /^:?-+:?$/.test(cell.replace(/\s/g, '')));
    if (isSep) continue;
    if (!headerSkipped) { headerSkipped = true; continue; } // шапка
    if (row.length < 2) continue;
    const key = row[0];
    const value = row[1].replace(/`/g, '').trim(); // убираем backticks
    if (key) table[key] = value;
  }

  return { table, startIndex };
}

// ---------- Утилиты ----------
function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

function valuesEqual(fmValue, tableValue) {
  if (fmValue === null || fmValue === undefined) return false;
  const a = String(fmValue).trim();
  const b = String(tableValue).trim();
  if (a === b) return true;
  // числовое сравнение (014 === 14 и т.п.)
  if (/^-?\d+(\.\d+)?$/.test(a) && /^-?\d+(\.\d+)?$/.test(b)) {
    return parseFloat(a) === parseFloat(b);
  }
  return false;
}

function formatYamlValue(value) {
  // YAML: одинарные кавычки, внутренние одинарные удваиваются
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function updateFrontmatterString(fmString, updates) {
  const eol = fmString.includes('\r\n') ? '\r\n' : '\n';
  const lines = fmString.split(/\r?\n/);
  const keyRe = /^([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)\s*:(.*)$/;

  const result = lines.map(line => {
    const m = line.match(keyRe);
    if (!m) return line;
    const key = m[1];
    if (key in updates) {
      return `${key}: ${formatYamlValue(updates[key])}`;
    }
    return line;
  });

  return result.join(eol);
}

// ---------- Обработка одного файла ----------
async function processFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  const bom = content.charCodeAt(0) === 0xFEFF ? '\uFEFF' : '';
  if (bom) content = content.slice(1);

  const parts = splitFrontmatter(content);
  if (!parts) return { status: 'skip', reason: 'нет frontmatter' };

  let fm;
  try {
    fm = yaml.load(parts.frontmatter) || {};
  } catch (e) {
    return { status: 'error', reason: `невалидный YAML: ${e.message}` };
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) {
    return { status: 'error', reason: 'frontmatter не объект' };
  }

  const parsed = parseTable(parts.body);
  if (!parsed) return { status: 'skip', reason: 'нет таблицы после frontmatter' };

  const { table, startIndex } = parsed;
  const warnings = [];

  if (parts.body.slice(0, startIndex).trim() !== '') {
    warnings.push('между frontmatter и таблицей есть контент');
  }

  const updates = {};
  for (const [key, tableValue] of Object.entries(table)) {
    if (tableValue === '') continue;
    if (!(key in fm)) {
      warnings.push(`ключ "${key}" есть в таблице, но нет во frontmatter`);
      continue;
    }
    if (isEmpty(fm[key])) {
      updates[key] = tableValue;                 // заполняем пустое
    } else if (!valuesEqual(fm[key], tableValue)) {
      warnings.push(
        `расхождение "${key}": frontmatter=${JSON.stringify(fm[key])} / таблица=${JSON.stringify(tableValue)}`
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return { status: 'ok', warnings };
  }

  const newFm = updateFrontmatterString(parts.frontmatter, updates);
  const newContent = content.replace(parts.frontmatter, () => newFm);

  if (!dryRun) {
    await fs.writeFile(filePath, bom + newContent, 'utf8');
  }

  return { status: 'updated', updates, warnings };
}

// ---------- main ----------
async function main() {
  const files = await findIndexFiles(rootDir);
  console.log(`Найдено ${files.length} файл(ов) index.md в ${path.resolve(rootDir)}`);
  if (dryRun) console.log('DRY-RUN: файлы не будут изменены\n');

  const counts = { updated: 0, ok: 0, skip: 0, error: 0 };

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const r = await processFile(file);
    counts[r.status] = (counts[r.status] || 0) + 1;

    if (r.status === 'updated') {
      console.log(`✏️  ${rel}`);
      for (const [k, v] of Object.entries(r.updates)) {
        console.log(`     ${k}: ${JSON.stringify(v)}`);
      }
    } else if (r.status === 'skip') {
      console.log(`⚠️  ${rel} — ${r.reason}`);
    } else if (r.status === 'error') {
      console.error(`❌ ${rel} — ${r.reason}`);
    }

    if (verbose && r.warnings && r.warnings.length) {
      for (const w of r.warnings) console.log(`   ⚠ ${w}`);
    }
  }

  console.log('\nИтог:');
  console.log(`  обновлено: ${counts.updated}`);
  console.log(`  без изменений: ${counts.ok}`);
  console.log(`  пропущено: ${counts.skip}`);
  console.log(`  ошибок: ${counts.error}`);
}

main().catch(e => { console.error(e); process.exit(1); });