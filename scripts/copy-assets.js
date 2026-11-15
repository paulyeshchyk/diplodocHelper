'use strict';
const fs = require('node:fs');
const path = require('node:path');

const SRC_ROOT = path.resolve(__dirname, '..', 'src', 'plugins');
const DIST_ROOT = path.resolve(__dirname, '..', 'dist', 'assets');

/**
 * @param {string} dir
 * @param {string[]} results
 */
function walk(dir, results = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, results);
        else results.push(full);
    }
    return results;
}

function copyAssets() {
    if (!fs.existsSync(SRC_ROOT)) {
        console.warn(`[copy-assets] src root not found: ${SRC_ROOT}`);
        return 0;
    }

    fs.mkdirSync(DIST_ROOT, { recursive: true });
    let count = 0;

    for (const file of walk(SRC_ROOT)) {
        const rel = path.relative(SRC_ROOT, file);
        const parts = rel.split(path.sep);
        const assetsIdx = parts.indexOf('assets');
        if (assetsIdx === -1) continue;

        const modulePath = parts.slice(0, assetsIdx).join('/');
        const fileName = parts.slice(assetsIdx + 1).join('/');
        if (!modulePath) continue; // assets/ прямо в src/plugins/ — пропускаем

        const targetDir = path.join(DIST_ROOT, modulePath);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(file, path.join(targetDir, fileName));
        count++;
    }

    console.log(`[copy-assets] Copied ${count} files to ${path.relative(process.cwd(), DIST_ROOT)}/`);
    return count;
}

copyAssets();
module.exports = { copyAssets };