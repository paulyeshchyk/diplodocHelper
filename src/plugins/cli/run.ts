import * as path from 'node:path';
import { DEFAULT_COMMON } from './config.constants.ts';
import { createRegistry } from './modules.ts';
import { findProjectRoot } from './paths.ts';
import type { ModuleDef } from './types.ts';

/**
 * Запуск модуля через registry.
 *
 * - `--help` / `-h` — печатает справку и выходит;
 * - иначе — резолвит project root, собирает commonOpts из DEFAULT_COMMON,
 *   `registry.run(name, argv, commonOpts)`.
 *
 * Wave 2: без чтения `plugins.config.yaml` (загрузчик — Wave 3).
 */
export async function runModuleCli(
  commandName: string,
  argv: string[],
  cliProjectRoot?: string | null,
): Promise<void> {
  const registry = createRegistry();
  const def = registry.get(commandName);
  if (!def) throw new Error(`Модуль "${commandName}" не зарегистрирован`);

  if (argv.includes('--help') || argv.includes('-h')) {
    printModuleHelp(def);
    return;
  }

  const projectRoot =
    cliProjectRoot ??
    (process.env.DOCS_PROJECT_ROOT
      ? path.resolve(process.env.DOCS_PROJECT_ROOT)
      : null) ??
    findProjectRoot(process.cwd()) ??
    null;
  if (!projectRoot) {
    throw new Error(
      `[cli] не удалось найти корень проекта (package.json не найден вверх от ${process.cwd()}). ` +
      `Передайте --project-root=<path>`,
    );
  }

  const argDefaults: Record<string, unknown> = {};
  for (const a of def.args) {
    if (a.default !== undefined) argDefaults[a.name] = a.default;
  }

  const commonOpts: Record<string, unknown> = { ...DEFAULT_COMMON, ...argDefaults };
  await registry.run(commandName, argv, commonOpts);
}

/**
 * Печатает список зарегистрированных модулей.
 * Wave 2: минимальный (без --yaml).
 */
export function printModulesList(): void {
  const registry = createRegistry();
  const byPhase = registry.listByPhase();

  console.log('Доступные модули:');
  console.log('');
  for (const phase of ['pre', 'build', 'post'] as const) {
    if (byPhase[phase].length === 0) continue;
    console.log(`${phase.toUpperCase()}:`);
    for (const m of byPhase[phase]) {
      console.log(`  ${m.name.padEnd(20)} ${m.description}`);
    }
    console.log('');
  }
}

function printModuleHelp(def: ModuleDef): void {
  console.log(`${def.name}`);
  console.log(`  ${def.description}`);
  console.log('');
  console.log(`Фаза: ${def.phase}`);
  console.log(`Зависимости: ${def.dependsOn && def.dependsOn.length ? def.dependsOn.join(', ') : '(нет)'}`);

  if (def.args.length > 0) {
    console.log('');
    console.log('Аргументы:');
    for (const a of def.args) {
      const req = a.required ? ' (required)' : '';
      console.log(`  ${a.flag.padEnd(20)} ${a.type}${req}`);
    }
  }

  console.log('');
  console.log('Common: --lang --docs-dir --generated-dir --log-level --stop-on-error --dry-run --verbose');
}

/**
 * CLI-entry: обработка `--list`.
 */
export function handleCliList(argv: string[]): boolean {
  if (argv[0] !== '--list' && argv[0] !== 'list') return false;

  if (argv.includes('--yaml')) {
    const registry = createRegistry();
    const data = registry.listYaml();
    console.log(JSON.stringify(data, null, 2));
  } else {
    printModulesList();
  }
  return true;
}

/**
 * Проверка, что `command` — один из зарегистрированных модулей.
 */
export function isRegisteredModule(command: string): boolean {
  return createRegistry().get(command) !== undefined;
}