import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MatrixBuilder, PagebuilderLegendItem, PagebuilderNavLink } from './types.ts';
import { findDefaultSharedAssetsDir } from './assets-path.ts';

export interface GenerateTableOptions {
    mapDir: string;
    outputDir: string;
    lang: string | string[];
    htmlFileName: string;
    cssFileName: string;
    jsFileName: string;
    dataFileName: string;
    title: string;
    legendItems: PagebuilderLegendItem[];
    matrixBuilder: MatrixBuilder;
    navLinks?: PagebuilderNavLink[];
    /**
     * Имя входного JSON, который уже сгенерирован в `mapDir` (например, `app-help-contents.json`).
     * Зеркалирует `helpMap.config.outputFileName`, но без жёсткой связи.
     */
    inputJsonName?: string;
    /** Каталог с ассетами самого отчёта (`bytescounter.js`, …). По умолчанию — shared assets. */
    assetsDir?: string;
    /** Каталог с общими ассетами. По умолчанию — `reportBuilder/assets`. */
    sharedAssetsDir?: string;
}

function findAsset(filename: string, searchDirs: string[]): string | null {
    for (const dir of searchDirs) {
        const p = path.join(dir, filename);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function renderFile(outputDir: string, filename: string, searchDirs: string[]): void {
    const src = findAsset(filename, searchDirs);
    if (src) {
        fs.copyFileSync(src, path.join(outputDir, filename));
    } else {
        console.warn(`⚠️ File was not rendered: ${filename} (searched: ${searchDirs.join(', ')})`);
    }
}

export function generateGenericTableFromArticles(options: GenerateTableOptions): void {
    const inputJsonName = options.inputJsonName ?? 'app-help-contents.json';
    const jsonPath = path.join(options.mapDir, inputJsonName);
    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ File ${jsonPath} was not found. Run collectCatalog first.`);
        return;
    }

    const sharedAssetsDir = options.sharedAssetsDir ?? findDefaultSharedAssetsDir();
    const reportAssetsDir = options.assetsDir ?? sharedAssetsDir;
    const searchDirs = [reportAssetsDir, sharedAssetsDir];

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Parameters<MatrixBuilder>[0];
    const langs = Array.isArray(options.lang) ? options.lang : [options.lang];
    const languageData: Record<string, ReturnType<MatrixBuilder>> = {};
    for (const l of langs) {
        languageData[l] = options.matrixBuilder(jsonData, l);
    }

    const dataToExport = {
        matrixData: languageData,
        legendItems: options.legendItems,
        navLinks: options.navLinks ?? [],
    };

    const templatePath = path.join(sharedAssetsDir, 'page-template.html');
    if (!fs.existsSync(templatePath)) {
        console.error(`❌ Template ${templatePath} was not found`);
        return;
    }

    const dataJson = JSON.stringify(dataToExport);
    const dataFilePath = path.join(options.outputDir, options.dataFileName);
    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(dataFilePath, `const periodicData = ${dataJson};`, 'utf8');

    renderFile(options.outputDir, options.cssFileName, searchDirs);
    renderFile(options.outputDir, options.jsFileName, searchDirs);
    renderFile(options.outputDir, 'core-renderer.js', [sharedAssetsDir]);
    renderFile(options.outputDir, 'core-style.css', [sharedAssetsDir]);

    const jsLink = `<script src="core-renderer.js" defer></script>\n<script src="${options.jsFileName}" defer></script>`;
    const dataLink = `<script src="${options.dataFileName}" defer></script>`;
    const cssLink = `<link rel="stylesheet" href="core-style.css">\n<link rel="stylesheet" href="${options.cssFileName}">`;

    let template = fs.readFileSync(templatePath, 'utf8');
    template = template.replace('{{CSS_LINK}}', cssLink);
    template = template.replace('{{DATA_LINK}}', dataLink);
    template = template.replace('{{JS_LINK}}', jsLink);
    template = template.replace(/\{\{TITLE\}\}/g, options.title);

    fs.writeFileSync(path.join(options.outputDir, options.htmlFileName), template, 'utf8');
}