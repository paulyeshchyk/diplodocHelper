#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

// ... (утилиты те же, что в collect-catalog: splitFrontmatter, parseListValue, rel)

const ROOTS = [
  { dimName: 'family',     root: 'Модули/Семействоfamily',      prefix: 'Семейство' },
  { dimName: 'layer',      root: 'Модули/Слоиlayer',            prefix: 'Слой' },
  { dimName: 'capability', root: 'Модули/КаталогCapabilitymap', prefix: 'Каталог' },
];

const DEFAULT_COLUMNS = {
  family: [
    { label: 'ID',         field: 'id' },
    { label: 'Модуль',     field: 'ident' },
    { label: 'Что делает', field: 'designation' },
  ],
  layer: [
    { label: 'ID',     field: 'id' },
    { label: 'Модуль', field: 'ident' },
    { label: 'Роль',   field: 'role', fallback: 'designation' },
  ],
  capability: [
    { label: 'ID',         field: 'id' },
    { label: 'Модуль',     field: 'ident' },
    { label: 'Что делает', field: 'designation' },
  ],
};

async function readYamlIfExists(p) {
  try { return yaml.load(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}

// Собрать модули так же, как collect-catalog
async function collectModules(docsRoot) {
  const modules = {};
  const walk = async (dir) => {
    let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', '_generated', '_includes', '_registry'].includes(e.name)) continue;
        await walk(full);
      } else if (e.isFile() && e.name === 'index.md') {
        const parentName = path.basename(dir);
        if (!parentName.startsWith('Модуль ')) continue;
        const raw = await fs.readFile(full, 'utf8');
        const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
        const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!m) continue;
        let fm;
        try { fm = yaml.load(m[1]) || {}; } catch { continue; }
        const relDir = rel(docsRoot, dir);
        modules[relDir] = {
          dir: relDir,
          id: fm.ID != null ? String(fm.ID) : '',
          families: parseListValue(fm.family),
          layers: parseListValue(fm.layer),
          capabilities: parseListValue(fm.capability),
        };
      }
    }
  };
  await walk(docsRoot);
  return modules;
}

// Извлечь из modules.md относительные ссылки на index.md модулей
function parseModulesMd(content, modulesMdDir, docsRoot) {
  const refs = new Set();
  // Ссылки вида [ID](../../Модуль X/index.md) или [ID](../../Модуль%20X/index.md)
  const re = /\]\(([^)#]+?\/index\.md)(?:#[^)]*)?\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const relPath = decodeURIComponent(m[1]);
    // Нормализация: modulesMdDir + relPath → абсолютный, потом относительно docsRoot
    const abs = path.resolve(modulesMdDir, relPath);
    refs.add(rel(docsRoot, abs));
  }
  return refs;
}

// Главное: для папки измерения найти slug по её modules.md
function inferSlugFromModulesMd(dimName, modulesMdPath, modules) {
  const content = require('fs').readFileSync(modulesMdPath, 'utf8');
  const modulesMdDir = path.dirname(modulesMdPath);
  // Нужен docsRoot — передадим через замыкание или параметр
  // (в реальном коде — параметром)
  const refs = parseModulesMd(content, modulesMdDir, /*docsRoot*/ null); // упрощено, см. ниже

  // map path → module
  // Вместо перебора — просто проверить, у каких модулей id совпадает с ID в таблице
  // Проще: для каждого модуля в modules проверить, есть ли его ID в тексте таблицы
  const votes = {};
  const field = { family: 'families', layer: 'layers', capability: 'capabilities' }[dimName];

  for (const mod of Object.values(modules)) {
    if (!mod.id) continue;
    // Проверим, есть ли модуль по ID в тексте
    const idRe = new RegExp(`\\|\\s*${escapeRe(mod.id)}\\s*\\|`);
    if (!idRe.test(content)) continue;
    for (const slug of mod[field]) {
      votes[slug] = (votes[slug] || 0) + 1;
    }
  }

  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { slug: '', confidence: 'none' };
  if (sorted.length === 1) return { slug: sorted[0][0], confidence: 'unique' };
  if (sorted[0][1] > sorted[1][1]) return { slug: sorted[0][0], confidence: 'majority' };
  return { slug: '', confidence: 'ambiguous', candidates: sorted.map(([s]) => s) };
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// main
async function main() {
  const docsRoot = path.resolve(process.argv[2] || '.');
  const outPath = path.join(docsRoot, '_registry', 'dimensions.yaml');

  const modules = await collectModules(docsRoot);
  console.log(`Модулей: ${Object.keys(modules).length}`);

  const registry = { version: 1, dimensions: {} };
  const warnings = [];

  for (const { dimName, root, prefix } of ROOTS) {
    const rootAbs = path.join(docsRoot, root);
    let entries;
    try { entries = await fs.readdir(rootAbs, { withFileTypes: true }); }
    catch (e) { warnings.push(`корень ${root}: ${e.message}`); continue; }

    const items = {};
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(rootAbs, e.name);
      const relDir = rel(docsRoot, dir);

      // title
      const idx = await readYamlIfExists(path.join(dir, 'index.yaml'));
      const title = (idx && idx.title) || e.name.replace(new RegExp(`^${escapeRe(prefix)}\\s*`), '').trim();

      // slug из modules.md
      const modulesMdPath = path.join(dir, 'modules.md');
      let slugInfo = { slug: '', confidence: 'no-modules-md' };
      try {
        await fs.access(modulesMdPath);
        slugInfo = inferSlugFromModulesMd(dimName, modulesMdPath, modules);
      } catch {}

      if (!slugInfo.slug) {
        warnings.push(`${dimName}/${e.name}: slug не определён (${slugInfo.confidence})${slugInfo.candidates ? ' [' + slugInfo.candidates.join(', ') + ']' : ''}`);
      }

      items[slugInfo.slug || `TODO_${e.name}`] = {
        dir: relDir,
        title,
      };
    }

    registry.dimensions[dimName] = {
      title: { family: 'Семейство', layer: 'Слой', capability: 'Capability' }[dimName],
      columns: DEFAULT_COLUMNS[dimName],
      items,
    };
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, yaml.dump(registry, { lineWidth: -1, noRefs: true }), 'utf8');
  console.log(`Записан: ${outPath}`);
  console.log(`Требуется ручная правка: ${warnings.length}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

main().catch(e => { console.error(e); process.exit(1); });