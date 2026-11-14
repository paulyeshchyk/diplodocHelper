#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

/**
 * Whitelisted merge: перетираем только секции, которые генерим
 * (`commands`, `submenus`, `menus`, `keybindings`).
 * Всё остальное (`configuration`, `languages`, `themes`, `snippets`, …)
 * сохраняется из существующего package.json — как есть.
 */
async function main() {
    const dryRun = process.argv.includes('--dry-run');

    const original = fs.readFileSync(packageJsonPath, 'utf8');
    const hadTrailingNewline = original.endsWith('\n');
    const pkg = JSON.parse(original);

    // .ts грузится нативно (Node 24, strip-types + ESM loader),
    // разрешение пути — относительно этого скрипта.
    const contrib = await import('../src/contrib/index.ts');
    const { buildContributes, COMMANDS, MENUS, KEYBINDINGS } = contrib;

    const built = buildContributes(COMMANDS, MENUS, KEYBINDINGS);

    if (!pkg.contributes) {
        console.warn('[generate-contrib] package.json#contributes отсутствует — создаётся с нуля');
    }
    const existingContributes = pkg.contributes ?? {};

    const newContributes = {
        ...existingContributes,
        commands: built.commands,
        submenus: built.submenus,
        menus: built.menus,
    };
    if (built.keybindings !== undefined) {
        newContributes.keybindings = built.keybindings;
    }

    const newPkg = { ...pkg, contributes: newContributes };
    const serialized = JSON.stringify(newPkg, null, 4);
    const finalContent = hadTrailingNewline ? serialized + '\n' : serialized;

    if (dryRun) {
        console.log('[generate-contrib] --dry-run: файл не записывается');
        console.log(JSON.stringify({ contributes: newContributes }, null, 2));
        return;
    }

    if (finalContent === original) {
        console.log('[generate-contrib] package.json не изменился');
        return;
    }

    fs.writeFileSync(packageJsonPath, finalContent, 'utf8');
    console.log('[generate-contrib] package.json обновлён:');
    console.log(`  commands:    ${built.commands.length}`);
    console.log(`  submenus:    ${built.submenus.length}`);
    console.log(`  menus:       ${Object.keys(built.menus).length}`);
    console.log(
        `  keybindings: ${built.keybindings ? built.keybindings.length : '(существующее сохранено)'}`,
    );
}

main().catch(e => {
    console.error(`❌ [generate-contrib] ${e.message || e}`);
    process.exit(1);
});