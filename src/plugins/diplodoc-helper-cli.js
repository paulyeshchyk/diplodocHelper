#!/usr/bin/env node

// @ts-nocheck

/**
 * CLI entry point. См. docs/PIPELINE.md.
 *
 * Подкоманды:
 *   --list [--yaml]          список мигрированных модулей
 *   <module> [--flags]       запуск одного модуля
 *   <module> --help          справка по модулю
 *   run-pipeline [--stage]   pipeline
 *   init-config [--flags]    создание конфигов
 *
 * Внутренняя логика — в `cli/*.ts`; здесь только разбор argv и
 * «тонкий» prelude для `--docs-project-root` (Contributing §2.7).
 */

const path = require('path');

// prelude: DOCS_PROJECT_ROOT должен быть выставлен ДО первого require
// `cli/*.ts`, иначе `_paths.ts` закеширует дефолт (Contributing §2.7).
const __args = process.argv.slice(2);
for (let i = 0; i < __args.length; i++) {
    const a = __args[i];
    if (a.startsWith('--docs-project-root=')) {
        process.env.DOCS_PROJECT_ROOT = a.slice('--docs-project-root='.length);
        __args.splice(i, 1);
        break;
    }
    if (a === '--docs-project-root' && __args[i + 1]) {
        process.env.DOCS_PROJECT_ROOT = __args[i + 1];
        __args.splice(i, 2);
        break;
    }
}

if (!process.env.DOCS_PROJECT_ROOT) {
    let cur = path.resolve(__dirname);
    while (cur && cur !== path.dirname(cur)) {
        if (require('fs').existsSync(path.join(cur, 'package.json'))) {
            process.env.DOCS_PROJECT_ROOT = path.join(cur, 'docs');
            break;
        }
        cur = path.dirname(cur);
    }
}

const { runModuleCli, handleCliList, isRegisteredModule } = require('./cli/run.ts');
const { runPipelineCli } = require('./cli/pipeline.cli.ts');
const { initConfigCli } = require('./cli/init-config.ts');

const command = __args[0];

if (!command || command === '--help' || command === '-h') {
    console.log(`diplodoc-helper — CLI entry point

Подкоманды:
  --list [--yaml]          список мигрированных модулей
  <module> [--flags]       запуск одного модуля
  <module> --help          справка по модулю
  run-pipeline [--stage]   pipeline (pre|build|post|all)
  init-config [--flags]    создание конфигов

См. docs/PIPELINE.md.`);
    process.exit(0);
}

if (command === 'init-config' || command === 'initConfig') {
    initConfigCli(__args.slice(1)).catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
    return;
}

if (command === 'run-pipeline' || command === 'runPipeline') {
    runPipelineCli(__args.slice(1)).catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
    return;
}

if (handleCliList(__args)) return;

if (isRegisteredModule(command)) {
    runModuleCli(command, __args.slice(1), null).catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
    return;
}

console.error(`❌ Неизвестная команда: ${command}`);
console.error(`   Запустите "diplodoc-helper --help".`);
process.exit(1);