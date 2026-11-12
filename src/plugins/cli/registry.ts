import { parseArgs } from './args.ts';
import { DEFAULT_COMMON_ARGS } from './config.constants.ts';
import type { ModuleDef, ModuleImpl } from './types.ts';

/**
 * Реестр модулей.
 *
 * Wave 1: только регистрация и диспетчеризация. Никакого merge опций
 * (L1-L4) — это Wave 3. `run` принимает уже смерженные opts.
 */
export class CommandRegistry {
  private readonly modules = new Map<string, ModuleDef>();

  register(def: ModuleDef): void {
    if (this.modules.has(def.name)) {
      throw new Error(`Модуль "${def.name}" уже зарегистрирован`);
    }
    this.modules.set(def.name, def);
  }

  get(name: string): ModuleDef | undefined {
    return this.modules.get(name);
  }

  list(): ModuleDef[] {
    return Array.from(this.modules.values());
  }

  listByPhase(): Record<'pre' | 'build' | 'post', ModuleDef[]> {
    const out: Record<'pre' | 'build' | 'post', ModuleDef[]> = {
      pre: [],
      build: [],
      post: [],
    };
    for (const m of this.modules.values()) out[m.phase].push(m);
    for (const k of ['pre', 'build', 'post'] as const) {
      out[k].sort((a, b) => a.defaultOrder - b.defaultOrder);
    }
    return out;
  }

  /**
   * Машинное описание — для `--list --yaml`.
   * Формат: массив объектов `{ name, phase, defaultOrder, description, args }`.
   */
  listYaml(): Array<Record<string, unknown>> {
    return this.list()
      .slice()
      .sort((a, b) => {
        if (a.phase !== b.phase) {
          const order = { pre: 0, build: 1, post: 2 };
          return order[a.phase] - order[b.phase];
        }
        return a.defaultOrder - b.defaultOrder;
      })
      .map(m => ({
        name: m.name,
        phase: m.phase,
        defaultOrder: m.defaultOrder,
        description: m.description,
        dependsOn: m.dependsOn ?? [],
        args: m.args.map(a => ({
          flag: a.flag,
          type: a.type,
          description: a.description,
          required: a.required ?? false,
        })),
      }));
  }

  /**
   * Запуск модуля:
   *   1. parseArgs(argv, moduleDef.args) — только спец. флаги;
   *   2. merge с commonOpts (пока плоский: commonOpts ∪ parsed,
   *      parsed доминирует — соответствует L2 > L1);
   *   3. lazy load();
   *   4. run(opts).
   */
  async run(
    name: string,
    argv: string[],
    commonOpts: Record<string, unknown> = {},
  ): Promise<void> {
    const def = this.modules.get(name);
    if (!def) throw new Error(`Модуль "${name}" не зарегистрирован`);

    // Common-флаги (--lang, --log-level, …) — тоже парсятся;
    // `seedDefaults=false` — не затираем commonOpts, которые уже
    // разрешены из config (L1-L4, Wave 3).
    // Приоритет: parsed (CLI) > commonOpts (config) > defaults (Wave 3).
    const allSpecs = [...DEFAULT_COMMON_ARGS, ...def.args];
    const parsed = parseArgs(argv, allSpecs, /* seedDefaults */ false); const effectiveOpts: Record<string, unknown> = {
      ...commonOpts,
      ...parsed,
    };

    const impl: ModuleImpl = await def.load();
    await impl.run(effectiveOpts);
  }
}