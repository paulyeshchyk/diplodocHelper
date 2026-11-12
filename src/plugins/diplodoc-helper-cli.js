#!/usr/bin/env node

// @ts-nocheck
// diplodoc-helper-cli.js
const { runModuleCli, handleCliList, isRegisteredModule } = require('./cli/run.ts');
const { runPipelineCli } = require('./cli/pipeline.cli.ts');
const { initConfigCli } = require('./cli/init-config.ts');
const path = require('path');
const fs = require('fs');

/**
  * Ищет вверх от `start` папку-корень проекта документации.
  *
  * Возвращает `PROJECT_ROOT`, от которого `_paths.ts` считает
  * `DOCS_DIR = <PROJECT_ROOT>/docs`.
  *
  * Два сценария (проверяются в порядке приоритета):
  *
  *   1. **Repo extension layout** — вверх находится папка `<X>`,
  *      содержащая `<X>/docs/docs/`. Значит `<X>/docs` — это docs-проект
  *      (обёртка над реальной docs), и правильный `PROJECT_ROOT = <X>/docs`.
  *      Пример: `<repo>/src/plugins/docs-registry` → `<repo>/docs`.
  *
  *   2. **Standalone docs project** — вверх находится папка `<X>`,
  *      содержащая `<X>/docs/_registry/` или `<X>/docs/_generated/`.
  *      Значит `<X>/docs` — это реальная docs, а `PROJECT_ROOT = <X>`.
  *      Пример: `<target>/plugins/docs-registry` → `<target>`.
  *
  * Возвращает `null`, если ни один сценарий не сработал. Тогда
  * `_paths.ts` возьмёт `process.cwd()` как fallback (dev из произвольной
  * директории — работает только с явным `--docs-project-root`).
  */
function findProjectRoot(start) {
    let cur = path.resolve(start);

    // 1. Repo extension layout: <X>/docs/docs/ → PROJECT_ROOT = <X>/docs
    while (cur && cur !== path.dirname(cur)) {
        if (fs.existsSync(path.join(cur, 'docs', 'docs'))) {
            return path.join(cur, 'docs');
        }
        cur = path.dirname(cur);
    }

    // 2. Standalone docs project: <X>/docs/_registry или <X>/docs/_generated
    cur = path.resolve(start);


    while (cur && cur !== path.dirname(cur)) {
        const docsDir = path.join(cur, 'docs');
        if (
            fs.existsSync(path.join(docsDir, '_registry')) ||
            fs.existsSync(path.join(docsDir, '_generated'))
        ) {
            return cur;
        }
        cur = path.dirname(cur);
    }

    return null;
}


// ── prelude: --docs-project-root должен быть известен ДО первого require
//    модуля, транзитивно подтягивающего `_paths.js` (кешируется Node).
//    Поддерживаем обе формы: '--docs-project-root=<path>' и
//    '--docs-project-root <path>'.
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

// Fallback: если флаг не передан — вычисляем от `__dirname` CLI (CJS — работает).
// `_paths.ts` (ESM) полагается на этот env и больше не пытается вычислить
// свой путь сам.
if (!process.env.DOCS_PROJECT_ROOT) {
    const guessed = findProjectRoot(__dirname);
    if (guessed) process.env.DOCS_PROJECT_ROOT = guessed;
}

// ─────────────────────────────────────────────────────────────────────────

// Если запускают как cli
if (require.main === module) {
    const args = __args;
    const command = args[0];

    // init-config — Wave 4
    if (command === 'init-config' || command === 'initConfig') {
        initConfigCli(args.slice(1))
            .catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
        return;
    }

    // run-pipeline — Wave 3
    if (command === 'run-pipeline' || command === 'runPipeline') {
        runPipelineCli(args.slice(1))
            .catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
        return;
    }


    // --list — печатает зарегистрированные модули (Wave 2)
    if (handleCliList(args)) {
        return;
    }

    // Wave 2: 5 модулей через registry
    if (isRegisteredModule(command)) {
        runModuleCli(command, args.slice(1), null)
            .catch(e => { console.error(`❌ ${e.message || e}`); process.exit(1); });
        return;
    }

    const docsDirIndex = args.indexOf('--docsDir');
    const docsDir = docsDirIndex !== -1 ? args[docsDirIndex + 1] : './docs';

    const outputDirIndex = args.indexOf('--outputDir');
    const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : './build';

    const segregation = args.includes('--segregation');


}


// --- helper для парсинга --flag и --flag=value ---
function extractFlag(argv, name) {
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith(name + '=')) return a.slice(name.length + 1);
        if (a === name && argv[i + 1]) return argv[i + 1];
    }
    return null;
}

module.exports = {

};
