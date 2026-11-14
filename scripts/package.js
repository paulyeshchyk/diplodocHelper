// scripts/package.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pkg = require('../package.json');

const outDir = path.resolve(__dirname, '../build');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const outFile = path.join(outDir, `${pkg.name}-${pkg.version}.vsix`);

console.log(`\n📦 Упаковка VSIX: ${path.basename(outFile)}`);

try {
    execSync(`vsce package --out "${outFile}" --allow-missing-repository`, { stdio: 'inherit' });
    console.log(`\n✅ VSIX успешно собран: ${outFile}`);
} catch (err) {
    console.error('\n❌ Ошибка упаковки VSIX. Сборка прервана.');
    process.exit(1);
}