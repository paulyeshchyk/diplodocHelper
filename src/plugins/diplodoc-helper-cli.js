#!/usr/bin/env node
const { runGeneration: generateHelpMap } = require('./helpMap/helpMap.js');
const { runGeneration: generateContexts } = require('./contexts/сontexts.js');
const { runGeneration: generateBreadcrumb } = require('./breadcrumb/breadcrumb.js');
const { injectCleanMode: generateTocCleanMode } = require('./tocCleanMode/post-build.js');

// Если запускают как cli
if (require.main === module) {
  const args = process.argv.slice(2);
  // Простой пример: node cli.js --helpMap --docsDir ./docs --outputDir ./build
  const command = args[0];
  const docsDirIndex = args.indexOf('--docsDir');
  const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';
  const outputDirIndex = args.indexOf('--outputDir');
  const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : './build';
  const segregation = args.includes('--segregation');

  if (command === 'helpMap') {
    generateHelpMap({ docsDir, outputDir, segregation });
  } else if (command === 'contexts') {
    generateContexts(docsDir);
  } else if (command === 'breadcrumb') {
    generateBreadcrumb(outputDir);
  } else if (command === 'tocCleanMode') {
    generateTocCleanMode(outputDir);
  }
}

module.exports = { generateHelpMap, generateContexts, generateBreadcrumb, generateTocCleanMode };
