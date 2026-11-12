#!/usr/bin/env node
/**
 * Bootstrap `run-pipeline`.
 *
 * Тонкий CJS-entry: реальная логика — в `src/plugins/cli/pipeline.cli.ts`.
 * `installScripts` копирует `src/plugins/cli/` → `plugins/cli/` и этот
 * файл → `plugins/run-pipeline.js`.
 */
'use strict';

// prelude: --docs-project-root до require('./cli/...') (см. CONTRIBUTING §2.7)
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

const { runPipelineCli } = require('./cli/pipeline.cli.ts');

runPipelineCli(args).catch(e => {
  console.error(`❌ ${e.message || e}`);
  process.exit(1);
});