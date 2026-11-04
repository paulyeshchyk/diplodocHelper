// @ts-nocheck
'use strict';

const fs = require('fs/promises');
const path = require('path');
const { GENERATED_DIR, DOCS_DIR, ASSETS_DIR } = require('../_paths.js');

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function pickUsable(dim, index) {
    return Object.entries(dim.items || {})
        .filter(([slug]) => (index[slug] || []).length > 0)
        .sort((a, b) => String(a[1].title || a[0]).localeCompare(String(b[1].title || b[0]), 'ru'));
}

function countBy(modules, field) {
    const out = {};
    for (const mod of Object.values(modules)) {
        for (const v of mod[field] || []) out[v] = (out[v] || 0) + 1;
    }
    return out;
}

async function runEmitFeatureMap(argv) {
    const opts = { lang: 'ru', catalog: null, out: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--lang=')) opts.lang = a.slice(7);
        else if (a === '--lang') opts.lang = argv[++i];
        else if (a.startsWith('--catalog=')) opts.catalog = a.slice(10);
        else if (a === '--catalog') opts.catalog = argv[++i];
        else if (a.startsWith('--out=')) opts.out = a.slice(6);
        else if (a === '--out') opts.out = argv[++i];
    }

    const catalogPath = opts.catalog
        ? path.resolve(opts.catalog)
        : path.join(GENERATED_DIR, `catalog.${opts.lang}.json`);
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

    const outPath = opts.out
        ? path.resolve(opts.out)
        : path.join(DOCS_DIR, opts.lang, 'Модули', 'FM', 'feature-map.md');
    const outDir = path.dirname(outPath);

    // --- префикс URL: docsRoot относительно DOCS_DIR → 'ru/Модули'
    const docsRootRel = path.relative(DOCS_DIR, catalog.docsRoot).replace(/\\/g, '/');
    const hrefOfModule = dir => `/${docsRootRel}/${dir}/index.html#naznachenie`;
    const hrefOfDim = (dimName, slug) => {
        const item = catalog.dimensions[dimName]?.items?.[slug];
        if (!item) return null;
        return `/${docsRootRel}/${item.dir}/index.html`;
    };
    // --- измерения
    const actors = pickUsable(catalog.dimensions.actor, catalog.index.actor);
    const caps = pickUsable(catalog.dimensions.capability, catalog.index.capability);
    const layers = pickUsable(catalog.dimensions.layer, catalog.index.layer);
    const fams = pickUsable(catalog.dimensions.family, catalog.index.family);

    const actorCount = countBy(catalog.modules, 'actors');
    const capCount = countBy(catalog.modules, 'capabilities');

    // --- ячейки
    const cells = new Map();
    for (const [dir, mod] of Object.entries(catalog.modules)) {
        for (const l of mod.layers || []) {
            for (const f of mod.families || []) {
                const key = `${l}::${f}`;
                if (!cells.has(key)) cells.set(key, []);
                cells.get(key).push({ dir, mod });
            }
        }
    }

    const chipHtml = ({ dir, mod }) => {
        const actorsAttr = (mod.actors || []).join(' ');
        const capsAttr = (mod.capabilities || []).join(' ');
        const famsAttr = (mod.families || []).join(' ');
        const layersAttr = (mod.layers || []).join(' ');

        // БЫЛО: const label = `${escHtml((mod.id || '') + ' ' + (mod.ident || ''))}`.trim();
        // СТАЛО:
        const label = `${escHtml(mod.ident || '')}`.trim();

        return `<a class="fm-chip" href="${encodeURI(hrefOfModule(dir))}" ` +
            `data-actor="${escHtml(actorsAttr)}" ` +
            `data-cap="${escHtml(capsAttr)}" ` +
            `data-family="${escHtml(famsAttr)}" ` +
            `data-layer="${escHtml(layersAttr)}" ` +
            `data-module="${escHtml(dir)}" ` +
            `title="${escHtml(mod.designation || '')}">` +
            `${label}</a>`;
    };

    const stripHtml = (name, label, items, countMap) =>
        `<div class="fm-strip" data-strip="${name}">` +
        `<span class="fm-strip-label">${escHtml(label)}</span>` +
        items
            .map(([slug, it]) => {
                const href = hrefOfDim(name, slug);
                const title = it.title || slug;
                return (
                    `<span class="fm-strip-item">` +
                    `<button type="button" class="fm-chip fm-strip-chip" ` +
                    `data-strip="${name}" data-value="${escHtml(slug)}" ` +
                    `title="Клик — фильтр по «${escHtml(title)}»">` +
                    `${escHtml(title)} <small>${countMap[slug] || 0}</small></button>` +
                    (href
                        ? `<a class="fm-strip-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                        `title="Открыть страницу «${escHtml(title)}»">→</a>`
                        : '') +
                    `</span>`
                );
            })
            .join('') +
        `</div>`;

    const actorStrip = stripHtml('actor', 'Actor', actors, actorCount);
    const capStrip = stripHtml('capability', 'Capability', caps, capCount);

    // --- сетка (ТРАНСПОНИРОВАНА: семейства — строки, слои — колонки)
    const thead =
        `<thead><tr><th></th>` +
        layers
            .map(([lSlug, lIt]) => {
                const href = hrefOfDim('layer', lSlug);
                const title = lIt.title || lSlug;
                return (
                    `<th class="fm-hdr">` +
                    `<button type="button" class="fm-hdr-btn" ` +
                    `data-strip="layer" data-value="${escHtml(lSlug)}" ` +
                    `title="Клик — фильтр по слою «${escHtml(title)}»">` +
                    `${escHtml(title)}</button>` +
                    (href
                        ? `<a class="fm-hdr-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                        `title="Открыть страницу «${escHtml(title)}»">→</a>`
                        : '') +
                    `</th>`
                );
            })
            .join('') +
        `</tr></thead>`;

    const tbody = `<tbody>` + fams.map(([fSlug, fIt]) => {
        const tds = layers.map(([lSlug]) => {
            const list = cells.get(`${lSlug}::${fSlug}`) || [];
            // Оборачиваем в div для flexbox-сетки внутри ячейки
            if (!list.length) return `<td class="is-empty"><div class="fm-cell-content">·</div></td>`;
            return `<td><div class="fm-cell-content">${list.map(chipHtml).join('')}</div></td>`;
        }).join('');

        const href = hrefOfDim('family', fSlug);
        const title = fIt.title || fSlug;
        const th =
            `<th class="fm-hdr">` +
            `<button type="button" class="fm-hdr-btn" ` +
            `data-strip="family" data-value="${escHtml(fSlug)}" ` +
            `title="Клик — фильтр по семейству «${escHtml(title)}»">` +
            `${escHtml(title)}</button>` +
            (href ? `<a class="fm-hdr-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                `title="Открыть страницу «${escHtml(title)}»">→</a>` : '') +
            `</th>`;

        return `<tr>${th}${tds}</tr>`;
    }).join('') + `</tbody>`;

    const grid = `<table class="fm-grid" data-modules>${thead}${tbody}</table>`;

    // --- ассеты → в <project>/docs/docs/_assets/{scripts,style}/
    const cssContent = await fs.readFile(path.join(__dirname, 'feature-map.css'), 'utf8');
    const jsContent = await fs.readFile(path.join(__dirname, 'feature-map.client.js'), 'utf8');

    const toolbar =
        `<div class="fm-toolbar">` +
        `<span class="fm-counter">Показано: —</span>` +
        `<button type="button" class="fm-reset-all" disabled>Сбросить все</button>` +
        `</div>`;

    // --- итоговый md с абсолютными ссылками
    const md = `---
title: Feature Map
sectionType: Page
---

# Feature Map

<div data-feature-map>
${actorStrip}
${capStrip}
${toolbar}
${grid}
</div>
`;

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, md, 'utf8');

    console.log(
        `✅ feature-map: ${outPath}\n` +
        `   actors=${actors.length}  caps=${caps.length}  grid=${fams.length}×${layers.length}`
    );
}

module.exports = { runEmitFeatureMap };

if (require.main === module) {
    runEmitFeatureMap(process.argv.slice(2)).catch(e => {
        console.error(e.message || e);
        process.exit(1);
    });
}
