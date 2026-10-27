#!/usr/bin/env node

// @ts-nocheck

/**
 * «Аккумулятор» сборки документации.
 * Один источник правды для Docker и Windows.
 *
 *   node ./plugins/docs-build.js                      — полный пайплайн
 *   node ./plugins/docs-build.js --list              — что вообще есть
 *   node ./plugins/docs-build.js --only=helpMap      — прогнать один шаг
 *   node ./plugins/docs-build.js --skip=roadMap      — всё кроме одного
 *   node ./plugins/docs-build.js --phase=pre,post    — только эти фазы
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const CLI = './plugins/diplodoc-helper-cli.js';
const isWin = process.platform === 'win32';

// ─── ХЕЛПЕРЫ ШАГОВ ─────────────────────────────────────────────
// Шаг = { name, cmd, args }  или  { name, run }.
// Дополнительно: enabled, when, env, cwd.

/** diplodoc-helper-cli.js <subcommand> [...] */
const cli = (name, ...args) => ({ name, cmd: 'node', args: [CLI, name, ...args] });

/** node <script> [...] */
const node = (name, scriptPath, ...args) => ({ name, cmd: 'node', args: [scriptPath, ...args] });

/** npx <pkg> [...] */
const npx = (name, ...args) => ({ name, cmd: 'npx', args });

/** inline JS: run('name', () => {...}) */
const run = (name, fn, opts = {}) => ({ name, run: fn, ...opts });

// ─── ПАЙПЛАЙН ──────────────────────────────────────────────────
// Хочешь добавить фичу — добавь одну строку в нужный массив.

const STEPS = {
    // ── PRE: подготавливаем ./docs перед сборкой ──────────────
    pre: [
        run('clean build', () => {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }),

        cli('reindexFigures', '--docsDir', './docs/ru'),
        cli('reindexFootnotes', '--docsDir', './docs/ru'),
        cli('helpMap'),
        cli('tocCleanMode'),
        cli('periodicStat'),
        cli('contexts'),
        cli('helptags'),
        // TODO(integration-test): проверить полную сборку pre→build→post с перестройкой abbrs и появлением раздела в toc.
        cli('abbrs'),
        cli('terms'),
        cli('gosts'),
        cli('createFigureContent'),
        cli('roadMap', '--dataPath', './plugins/roadMap/roadmap-data.json'),
    ],

    // ── BUILD: ./docs → ./build ───────────────────────────────
    build: [
        npx(
            'diplodoc build',
            '@diplodoc/cli',
            '-i',
            './docs',
            '-o',
            './build',
            '--allow-custom-resources',
            '--apply-presets',
            '--quiet',
            'internal'
        ),
    ],

    // ── POST: пост-обработка ./build ──────────────────────────
    post: [
        cli('footnoteAnchors', './build'),
        cli('abbrTitles', './build', '--docsDir', './docs'),
        cli('termTitles', './build', '--docsDir', './docs'),
        cli('footnoteNumbering', '--docsDir', './docs/ru', '--outputDir', './build'),
        cli(
            'footnoteList',
            '--docsDir',
            './docs/ru',
            '--targetHtml',
            './build/ru/Дополнительнаяинформация/Переченьсносок/index.html'
        ),
        cli('gostsInject', '--docsDir', './docs/ru'), // 3. Внедряем таблицу в готовый HTML

        node(
            'copy mdedit_fixes',
            './plugins/scripts/copy-dir.js',
            './plugins/mdedit_fixes',
            './build/plugins/mdedit_fixes'
        ),
        cli('breadcrumb', './build'),
        cli('contexttags', './build'),
        cli('comments', './build'),
        cli('ganttFixScroll', './build'),
        cli('periodicTable'),
        cli('periodicTableHelpTag'),
        cli('periodicTableContext'),

        run('cleanup service files', () => {
            for (const f of ['.yfm', '.yfmignore', '.yfmlint']) {
                fs.rmSync(path.join(buildDir, f), { recursive: true, force: true });
            }
        }),
    ],
};

const PHASES = /** @type {const} */ (['pre', 'build', 'post']);
const ALL_STEPS = PHASES.flatMap(phase => STEPS[phase].map(step => ({ phase, step })));


/**
 * Квотирует один аргумент для последующей передачи через shell.
 * Возвращает строку, безопасную для вставки в командную строку.
 * @param {string | number} arg
 * @returns {string}
 */
function quoteShellArg(arg) {
    const s = String(arg);
    if (s === '') return isWin ? '""' : "''";

    // Безопасные символы: буквы, цифры, точки, слэши, дефис, =, :, запятая, @, +
    // Ничего из shell-метасимволов (| & ; < > ^ % ! $ ` " ' \ * ? ( ) [ ] { } пробел) не входит.
    if (/^[a-zA-Z0-9._\-=:,/\\@+]+$/.test(s)) return s;

    if (isWin) {
        // cmd.exe: оборачиваем в двойные кавычки, внутренние удваиваем
        return '"' + s.replace(/"/g, '""') + '"';
    }
    // POSIX sh: одинарные кавычки, внутренние ' экранируются через '\''
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Склеивает команду и аргументы в одну строку для запуска через shell.
 * @param {string} cmd
 * @param {string[]} args
 * @returns {string}
 */
function buildShellCommand(cmd, args) {
    return [cmd, ...args].map(quoteShellArg).join(' ');
}

// ─── CLI-АРГУМЕНТЫ ─────────────────────────────────────────────

function parseArgs(argv) {
    const out = { only: null, skip: new Set(), phase: null, list: false, help: false };
    for (const a of argv) {
        if (a === '--list') out.list = true;
        else if (a === '--help' || a === '-h') out.help = true;
        else if (a.startsWith('--only=')) out.only = new Set(a.slice(7).split(',').filter(Boolean));
        else if (a.startsWith('--skip=')) out.skip = new Set(a.slice(7).split(',').filter(Boolean));
        else if (a.startsWith('--phase=')) out.phase = a.slice(8).split(',').filter(Boolean);
    }
    return out;
}

function shouldRun(step, phase, opts) {
    if (step.enabled === false) return false;
    if (step.when && !step.when()) return false;
    if (opts.phase && !opts.phase.includes(phase)) return false;
    if (opts.only && !opts.only.has(step.name)) return false;
    if (opts.skip.has(step.name)) return false;
    return true;
}

// ─── ВЫПОЛНЕНИЕ ────────────────────────────────────────────────

async function execute(step, phase) {
    const startedAt = Date.now();
    console.log(`\n▶ [${phase}] ${step.name}`);

    try {
        if (step.run) {
            await step.run();
        } else {
            const opts = {
                cwd: step.cwd || projectRoot,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_PATH: process.env.NODE_PATH || path.join(projectRoot, 'node_modules'),
                    ...step.env,
                },
            };

            let result;
            if (isWin) {
                // На Windows `npx` — это npx.cmd, без shell не запускается.
                // Передаём ОДНУ строку без args — это отключает DEP0190.
                const cmdLine = buildShellCommand(step.cmd, step.args);
                result = spawnSync(cmdLine, [], { ...opts, shell: true });
            } else {
                // На POSIX shell не нужен: node и npx — исполняемые с shebang.
                result = spawnSync(step.cmd, step.args, { ...opts, shell: false });
            }

            if (result.error) throw result.error;
            if (result.status !== 0) throw new Error(`exit code ${result.status}`);
        }

        const secs = ((Date.now() - startedAt) / 1000).toFixed(2);
        console.log(`✓ ${step.name} (${secs}s)`);
    } catch (e) {
        console.error(`❌ ${step.name}: ${e.message}`);
        process.exit(1);
    }
}

// ─── MAIN ──────────────────────────────────────────────────────

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    if (opts.help) {
        console.log(`
Использование: node ./plugins/docs-build.js [флаги]

  --phase=pre,build,post     только указанные фазы
  --only=step1,step2         только перечисленные шаги
  --skip=step1,step2         пропустить перечисленные шаги
  --list                     показать все шаги и выйти
  --help                     эта справка
`);
        return;
    }

    if (opts.list) {
        for (const phase of PHASES) {
            console.log(`\n[${phase}]`);
            for (const s of STEPS[phase]) {
                const off = s.enabled === false ? '  (disabled)' : '';
                console.log(`  - ${s.name}${off}`);
            }
        }
        return;
    }

    console.log('▶ docs-build: старт');
    for (const { phase, step } of ALL_STEPS) {
        if (!shouldRun(step, phase, opts)) {
            if (opts.only || opts.phase || opts.skip.size) {
                console.log(`↷ [${phase}] ${step.name} — пропущен`);
            }
            continue;
        }
        await execute(step, phase);
    }
    console.log('\n✅ docs-build: готово');
}

if (require.main === module) {
    main().catch(e => {
        console.error(`❌ Fatal: ${e.message}`);
        process.exit(1);
    });
}

module.exports = { STEPS, PHASES };
