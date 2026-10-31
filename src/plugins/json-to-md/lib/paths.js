'use strict';

const fs = require('fs');
const path = require('path');

function resolveOutputPath({ outputDir, outputFile, defaultFileName }) {
  if (outputFile) {
    const hasSeparator = /[\\/]/.test(outputFile);
    return hasSeparator
      ? path.resolve(outputFile)
      : path.join(outputDir, outputFile);
  }
  return path.join(outputDir, defaultFileName);
}

function ensureParentDir(filePath) {
  const parent = path.dirname(filePath);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
  return parent;
}

module.exports = { resolveOutputPath, ensureParentDir };