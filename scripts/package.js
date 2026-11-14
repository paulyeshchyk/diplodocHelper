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
execSync(`vsce package --out "${outFile}" --allow-missing-repository`, { stdio: 'inherit' });