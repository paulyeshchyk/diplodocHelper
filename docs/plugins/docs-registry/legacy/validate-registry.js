#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const fix = argv.includes('--fix');
const positional = argv.filter(a => !a.startsWith('-'));
const docsRoot = path.resolve(positional[0] || './ru');
const registryPath = path.resolve(positional[1] || './_registry/dimensions.yaml');

// ---------- Утилиты ----------
function toPosix(p) { return p.split(path.sep).join('/'); }
function rel(root, p) { return toPosix(path.relative(root, p)); }
const SKIP_DIRS = new Set(['node_modules', '.git', '_generated', '_includes', '_registry']);

async function collectAllDirs(rootDir) {
  const dirs = [];
  const walk = async (dir) => {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      dirs.push(rel(rootDir, full));
      await walk(full);
    }
  };
  await walk(rootDir);
  return dirs;
}

function normalize(s) {
  return String(s).toLowerCase().replace(/[\s_\-]+/g, '');
}

function findSuggestions(target, allDirs) {
  // 1. точное нормализованное совпадение (пробелы/подчёркивания неважны)
  const tNorm = normalize(target);
  const exact = allDirs.filter(d => normalize(d) === tNorm);
  if (exact.length > 0) return exact;

  // 2. по последнему сегменту пути (лечит отсутствие "Модули/" в префиксе)
  const parts = target.split('/');
  const lastNorm = normalize(parts[parts.length - 1]);
  const byLast = allDirs.filter(d => normalize(d.split('/').pop()) === lastNorm);
  if (byLast.length > 0) return byLast;

  // 3. по совпадению хвоста пути
  const scored = allDirs.map(d => {
    const ds = d.split('/').map(normalize);
    const ts = parts.map(normalize);
    let score = 0;
    const minLen = Math.min(ds.length, ts.length);
    for (let i = 1; i <= minLen; i++) {
      if (ds[ds.length - i] === ts[ts.length - i]) score++;
      else break;
    }
    return { dir: d, score };
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 3);
  return scored.map(x => x.dir);
}

// ---------- main ----------
async function main() {
  console.log(`docsRoot:     ${docsRoot}`);
  console.log(`registryPath: ${registryPath}`);

  let registry;
  try { registry = yaml.load(await fs.readFile(registryPath, 'utf8')); }
  catch (e) { console.error(`Не удалось прочитать реестр: ${e.message}`); process.exit(1); }
  if (!registry || !registry.dimensions) {
    console.error('В реестре нет .dimensions');
    process.exit(1);
  }

  const allDirs = await collectAllDirs(docsRoot);
  console.log(`Папок в docsRoot: ${allDirs.length}`);
  if (allDirs.length === 0) {
    console.error('Пусто. docsRoot указан неверно? (ожидается общий родитель "Реестр" и "Модули")');
    process.exit(1);
  }

  let ok = 0, missing = 0, fixed = 0;
  const problems = [];

  for (const [dimName, dim] of Object.entries(registry.dimensions)) {
    for (const [slug, item] of Object.entries(dim.items || {})) {
      const dir = item.dir;
      if (allDirs.includes(dir)) { ok++; continue; }
      missing++;
      const suggestions = findSuggestions(dir, allDirs);
      problems.push({ dimName, slug, dir, suggestions, item });
      if (fix && suggestions.length === 1) {
        item.dir = suggestions[0];
        fixed++;
      }
    }
  }

  console.log('');
  if (problems.length === 0) {
    console.log(`✓ Все ${ok} путей в реестре корректны.`);
    return;
  }

  for (const p of problems) {
    console.log(`✗ ${p.dimName}/${p.slug}`);
    console.log(`    было:   "${p.dir}"`);
    if (p.suggestions.length === 0) {
      console.log(`    нет похожих папок (проверьте вручную)`);
    } else if (p.suggestions.length === 1) {
      console.log(`    замена: "${p.suggestions[0]}"${fix ? '  ← применено' : ''}`);
    } else {
      console.log(`    варианты (уточните):`);
      for (const s of p.suggestions) console.log(`      - ${s}`);
    }
  }

  console.log('');
  console.log(`Итого: ok=${ok}, missing=${missing}` + (fix ? `, fixed=${fixed}, осталось=${missing - fixed}` : ''));

  if (fix && fixed > 0) {
    await fs.writeFile(registryPath, yaml.dump(registry, { lineWidth: -1, noRefs: true }), 'utf8');
    console.log(`Реестр перезаписан: ${registryPath}`);
  }

  process.exit(missing > 0 && !fix ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });