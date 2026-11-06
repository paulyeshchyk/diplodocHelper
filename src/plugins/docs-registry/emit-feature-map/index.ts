import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Html_Escape_Text } from '../../utils/html/Html_Escape_Text.ts';
import { DOCS_DIR, GENERATED_DIR } from '../_paths.ts';
import { loadFeatureMapConfig } from './feature-map.constants.ts';
import type {
    CatalogDimension,
    CatalogModule,
    CatalogSnapshot,
} from './feature-map.types.ts';

export interface RunEmitFeatureMapOptions {
    /**
     * Корень docs-папки. Переопределяет `DOCS_DIR` из `_paths.js`.
     * Из CLI: `--docs-root=<path>`.
     *
     * Применяется в:
     *   - дефолтном `outPath` (шаблон `outputPathTemplate` относительно него);
     *   - расчёте `docsRootRel` (relative от `catalog.docsRoot`).
     */
    docsDir?: string;

    /**
     * Где искать `catalog.<lang>.json` при отсутствии `--catalog`.
     * Переопределяет `GENERATED_DIR` из `_paths.js`.
     * Из CLI: `--generated-dir=<path>`.
     */
    generatedDir?: string;
}

/**
 * Генератор `feature-map.md` из `catalog.<lang>.json`.
 *
 * @param argv — CLI-флаги: `--lang`, `--catalog`, `--out`, `--config`.
 *
 * Поведение:
 *   - без `--config` — `DEFAULT_FEATURE_MAP_CONFIG` (текущая иерархия
 *     `Модули/`, измерения actor/capability/layer/family);
 *   - с `--config` — shallow merge пользовательского JSON поверх дефолта
 *     (см. `loadFeatureMapConfig`);
 *   - `--docs-project-root` (обрабатывается в prelude `diplodoc-helper-cli.js`)
 *     переопределяет `DOCS_DIR`/`GENERATED_DIR` через `_paths.js`.
 *
 * Ассеты (`feature-map.css`, `feature-map.client.js`) читает НЕ эта функция,
 * а `runGeneration` из `feature-map.injector.ts` — они инжектятся в HTML
 * отдельным шагом. В оригинальном `index.js` они читались, но не использовались.
 */
export async function runEmitFeatureMap(
    argv: string[],
    opts: RunEmitFeatureMapOptions = {},
): Promise<void> {
    const parsed = parseArgs(argv);
    const cfg = loadFeatureMapConfig(parsed.config);

    const effectiveDocsDir = opts.docsDir ?? DOCS_DIR;
    const effectiveGeneratedDir = opts.generatedDir ?? GENERATED_DIR;

    const catalogPath = parsed.catalog
        ? path.resolve(parsed.catalog)
        : path.join(effectiveGeneratedDir, `catalog.${parsed.lang}.json`);
    const catalog: CatalogSnapshot = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

    const outPath = parsed.out
        ? path.resolve(parsed.out)
        : path.join(effectiveDocsDir, interpolate(cfg.outputPathTemplate, { lang: parsed.lang }));
    const outDir = path.dirname(outPath);

    // --- префикс URL: docsRoot относительно DOCS_DIR ---
    const docsRootRel = path.relative(effectiveDocsDir, catalog.docsRoot).replace(/\\/g, '/');

    const esc = (s: unknown): string => (s == null ? '' : Html_Escape_Text.escape(s));

    const hrefOfModule = (dir: string): string =>
        interpolate(cfg.moduleHrefTemplate, {
            docsRootRel,
            dir,
            anchor: cfg.moduleHrefAnchor,
        });

    const hrefOfDim = (dimName: string, slug: string): string | null => {
        const item = catalog.dimensions[dimName]?.items?.[slug];
        if (!item) return null;
        return `/${docsRootRel}/${item.dir}/index.html`;
    };

    // --- все измерения, участвующие в фильтрации/сетке ---
    // Порядок: stripDimensions → row → col. Используется для:
    //   1) data-dims на root `<div data-feature-map data-dims="…">`;
    //   2) ключи data-attrs в chipHtml (только declared dims).
    const allDims: string[] = Array.from(new Set([
        ...cfg.stripDimensions,
        cfg.rowDimension,
        cfg.columnDimension,
    ]));

    // --- поля в CatalogModule, соответствующие измерениям сетки ---
    const rowField = cfg.dimToFieldMap[cfg.rowDimension];
    if (!rowField) {
        throw new Error(
            `[feature-map] config.dimToFieldMap["${cfg.rowDimension}"] is not defined`,
        );
    }
    const columnField = cfg.dimToFieldMap[cfg.columnDimension];
    if (!columnField) {
        throw new Error(
            `[feature-map] config.dimToFieldMap["${cfg.columnDimension}"] is not defined`,
        );
    }

    // --- ячейки: (columnValue × rowValue) → [modules] ---
    const cells = new Map<string, Array<{ dir: string; mod: CatalogModule }>>();
    for (const [dir, mod] of Object.entries(catalog.modules)) {
        const colValues = Array.isArray(mod[columnField]) ? (mod[columnField] as string[]) : [];
        const rowValues = Array.isArray(mod[rowField]) ? (mod[rowField] as string[]) : [];
        for (const c of colValues) {
            for (const r of rowValues) {
                const key = `${c}::${r}`;
                const bucket = cells.get(key) ?? [];
                bucket.push({ dir, mod });
                cells.set(key, bucket);
            }
        }
    }

    // --- chip (карточка модуля) ---    
    const chipHtml = ({ dir, mod }: { dir: string; mod: CatalogModule }): string => {
        // data-attrs: JSON `{ [dim]: string[] }` для всех declared dims,
        // у которых у модуля есть непустые значения.
        // Escaping: HTML-entity для `&<>'` (не `"` — атрибут в `'...'`,
        // JSON.parse в браузере увидит исходный объект после entity-декодирования).
        const dataAttrs: Record<string, string[]> = {};
        for (const dim of allDims) {
            const field = cfg.dimToFieldMap[dim];
            if (!field) continue;
            const raw = mod[field];
            const values = Array.isArray(raw) ? raw : [];
            if (values.length) dataAttrs[dim] = values;
        }
        const attrsJson = JSON.stringify(dataAttrs)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '&#39;');

        // chip label: cfg.chipLabelField (если scalar-строка) → basename(dir).
        // Никогда не полный dir — в глубоких иерархиях карточка нечитаема.
        const rawLabel = mod[cfg.chipLabelField];
        const scalarLabel = typeof rawLabel === 'string' ? rawLabel.trim() : '';
        const label = esc(scalarLabel || path.basename(dir));

        return `<a class="fm-chip" href="${encodeURI(hrefOfModule(dir))}" ` +
            `data-attrs='${attrsJson}' ` +
            `data-module="${esc(dir)}" ` +
            `title="${esc(mod.designation ?? '')}">` +
            `${label}</a>`;
    };

    // --- strip (полоса фильтров над сеткой) ---
    const stripHtml = (
        name: string,
        label: string,
        items: Array<[string, { title: string }]>,
        countMap: Record<string, number>,
    ): string =>
        `<div class="fm-strip" data-strip="${name}">` +
        `<span class="fm-strip-label">${esc(label)}</span>` +
        items.map(([slug, it]) => {
            const href = hrefOfDim(name, slug);
            const title = it.title || slug;
            return `<span class="fm-strip-item">` +
                `<button type="button" class="fm-chip fm-strip-chip" ` +
                `data-strip="${name}" data-value="${esc(slug)}" ` +
                `title="Клик — фильтр по «${esc(title)}»">` +
                `${esc(title)} <small>${countMap[slug] || 0}</small></button>` +
                (href
                    ? `<a class="fm-strip-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                    `title="Открыть страницу «${esc(title)}»">→</a>`
                    : '') +
                `</span>`;
        }).join('') +
        `</div>`;

    // --- все strip'ы из cfg.stripDimensions ---
    const stripsMarkup = cfg.stripDimensions
        .map(dim => {
            const field = cfg.dimToFieldMap[dim];
            if (!field) {
                console.warn(
                    `[feature-map] strip dimension "${dim}" has no dimToFieldMap entry — skipped`,
                );
                return '';
            }
            const items = pickUsable(catalog.dimensions[dim], catalog.index[dim]);
            const countMap = countBy(catalog.modules, field);
            const label = cfg.stripLabels[dim] ?? dim;
            return stripHtml(dim, label, items, countMap);
        })
        .filter(Boolean)
        .join('\n');

    // --- сетка: колонки = columnDimension, строки = rowDimension ---
    const colItems = pickUsable(
        catalog.dimensions[cfg.columnDimension],
        catalog.index[cfg.columnDimension],
    );
    const rowItems = pickUsable(
        catalog.dimensions[cfg.rowDimension],
        catalog.index[cfg.rowDimension],
    );

    const thead = `<thead><tr><th></th>` +
        colItems.map(([cSlug, cIt]) => {
            const href = hrefOfDim(cfg.columnDimension, cSlug);
            const title = cIt.title || cSlug;
            return `<th class="fm-hdr">` +
                `<button type="button" class="fm-hdr-btn" ` +
                `data-strip="${esc(cfg.columnDimension)}" data-value="${esc(cSlug)}" ` +
                `title="Клик — фильтр по «${esc(title)}»">` +
                `${esc(title)}</button>` +
                (href
                    ? `<a class="fm-hdr-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                    `title="Открыть страницу «${esc(title)}»">→</a>`
                    : '') +
                `</th>`;
        }).join('') +
        `</tr></thead>`;

    const tbody = `<tbody>` +
        rowItems.map(([rSlug, rIt]) => {
            const tds = colItems.map(([cSlug]) => {
                const list = cells.get(`${cSlug}::${rSlug}`) ?? [];
                if (!list.length) {
                    return `<td class="is-empty"><div class="fm-cell-content">${esc(cfg.emptyCellSymbol)}</div></td>`;
                }
                return `<td><div class="fm-cell-content">${list.map(chipHtml).join('')}</div></td>`;
            }).join('');

            const href = hrefOfDim(cfg.rowDimension, rSlug);
            const title = rIt.title || rSlug;
            const th =
                `<th class="fm-hdr">` +
                `<button type="button" class="fm-hdr-btn" ` +
                `data-strip="${esc(cfg.rowDimension)}" data-value="${esc(rSlug)}" ` +
                `title="Клик — фильтр по «${esc(title)}»">` +
                `${esc(title)}</button>` +
                (href
                    ? `<a class="fm-hdr-link" href="${encodeURI(href)}" target="_blank" rel="noopener" ` +
                    `title="Открыть страницу «${esc(title)}»">→</a>`
                    : '') +
                `</th>`;

            return `<tr>${th}${tds}</tr>`;
        }).join('') +
        `</tbody>`;

    const grid = `<table class="fm-grid" data-modules>${thead}${tbody}</table>`;

    // --- тулбар ---
    const toolbar =
        `<div class="fm-toolbar">` +
        `<span class="fm-counter">${esc(cfg.counterPlaceholder)}</span>` +
        `<button type="button" class="fm-reset-all" disabled>${esc(cfg.resetButtonText)}</button>` +
        `</div>`;

    // --- итоговый md ---
    const md = `---
title: ${cfg.title}
sectionType: ${cfg.sectionType}
---

# ${cfg.title}

<div data-feature-map data-dims="${esc(allDims.join(','))}">
${stripsMarkup}
${toolbar}
${grid}
</div>
`;

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, md, 'utf8');

    console.log(
        `✅ feature-map: ${outPath}\n` +
        `   strips=${cfg.stripDimensions.length}  grid=${rowItems.length}×${colItems.length}`
    );
}

// --- helpers --------------------------------------------------------------

interface RunEmitParsed {
    lang: string;
    catalog: string | null;
    out: string | null;
    config: string | null;
}

function parseArgs(argv: string[]): RunEmitParsed {
    const opts: RunEmitParsed = { lang: 'ru', catalog: null, out: null, config: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--lang=')) opts.lang = a.slice('--lang='.length);
        else if (a === '--lang') opts.lang = argv[++i];
        else if (a.startsWith('--catalog=')) opts.catalog = a.slice('--catalog='.length);
        else if (a === '--catalog') opts.catalog = argv[++i];
        else if (a.startsWith('--out=')) opts.out = a.slice('--out='.length);
        else if (a === '--out') opts.out = argv[++i];
        else if (a.startsWith('--config=')) opts.config = a.slice('--config='.length);
        else if (a === '--config') opts.config = argv[++i];
    }
    return opts;
}

function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function pickUsable(
    dim: CatalogDimension | undefined,
    index: Record<string, string[]> | undefined,
): Array<[string, { title: string }]> {
    if (!dim) return [];
    return Object.entries(dim.items || {})
        .filter(([slug]) => ((index ?? {})[slug] || []).length > 0)
        .sort((a, b) =>
            String(a[1].title || a[0]).localeCompare(String(b[1].title || b[0]), 'ru'),
        );
}

function countBy(
    modules: Record<string, CatalogModule>,
    field: string,
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const mod of Object.values(modules)) {
        const vs = mod[field];
        if (!Array.isArray(vs)) continue;
        for (const v of vs) {
            const key = String(v);
            out[key] = (out[key] ?? 0) + 1;
        }
    }
    return out;
}