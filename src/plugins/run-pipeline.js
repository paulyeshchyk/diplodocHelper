#!/usr/bin/env node

'use strict';

const { initLogger } = require('./utils/logger');

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--docs-project-root=')) {
    process.env.DOCS_PROJECT_ROOT = a.slice('--docs-project-root='.length);
    args.splice(i, 1);
    break;
  }
  if (a === '--docs-project-root' && args[i + 1]) {
    process.env.DOCS_PROJECT_ROOT = args[i + 1];
    args.splice(i, 2);
    break;
  }
}

// Инициализируем ДО загрузки cli, чтобы logger был готов к моменту
// первого createLogger(). Дефолт 'off' — но pipeline.cli.ts пере-инициализирует
// с level из yaml/env (см. ниже).
initLogger();

const { runPipelineCli } = require('./cli/pipeline.cli.ts');

runPipelineCli(args).catch(e => {
  console.error(`❌ ${e.message || e}`);
  process.exit(1);
});