#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [, , srcArg, dstArg] = process.argv;
if (!srcArg || !dstArg) {
    console.error('❌ Использование: node copy-dir.js <srcDir> <dstDir>');
    process.exit(1);
}

const src = path.resolve(srcArg);
const dst = path.resolve(dstArg);

if (!fs.existsSync(src)) {
    console.error(`❌ [copy-dir] Источник не найден: ${src}`);
    process.exit(1);
}

fs.mkdirSync(dst, { recursive: true });

/**
 * @param {string} from
 * @param {string} to
 */
function copyRecursive(from, to) {
    const entries = fs.readdirSync(from, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(from, entry.name);
        const dstPath = path.join(to, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(dstPath, { recursive: true });
            copyRecursive(srcPath, dstPath);
        } else if (entry.isSymbolicLink()) {
            const link = fs.readlinkSync(srcPath);
            try {
                fs.symlinkSync(link, dstPath);
            } catch {
                /* если не поддерживается — копируем как файл */
            }
        } else {
            fs.copyFileSync(srcPath, dstPath);
        }
    }
}

copyRecursive(src, dst);

// Считаем, сколько скопировали — полезно для лога
let count = 0;
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else count++;
    }
})(dst);

console.log(`[copy-dir] ${src} → ${dst} (${count} файлов)`);
