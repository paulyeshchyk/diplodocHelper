import { DEFAULT_COMMON } from '../config.constants.ts';
import type { Inspection } from '../init-config.types.ts';
import type { CommandRegistry } from '../registry.ts';

/**
 * `plugins.config.yaml` — конфиг пайплайна.
 *
 * Wave 4: включает все зарегистрированные ModuleDef (5 в Wave 2).
 * Остальные 22 legacy-модуля — не в registry, добавятся в Wave 5.
 *
 * `enabled` по эвристикам:
 *   - `emitFeatureMap` — `true` если есть `_registry/feature-map.config.json`
 *     или он будет создан;
 *   - `collectCatalog` — всегда `true` (нужен для всего);
 *   - остальные — `true` (по умолчанию).
 */
export function scaffoldPipeline(inspection: Inspection, registry: CommandRegistry): string {
  const lines: string[] = [];
  lines.push('# Конфиг пайплайна diplodoc-helper.');
  lines.push('# Wave 4: только 5 мигрированных модулей.');
  lines.push('# Подробности: docs/PIPELINE.md (TODO).');
  lines.push('');
  lines.push(`lang: ${inspection.lang}`);
  lines.push('');
  lines.push('common:');
  lines.push(`  logLevel: ${DEFAULT_COMMON.logLevel}`);
  lines.push(`  stopOnError: ${DEFAULT_COMMON.stopOnError}`);
  lines.push('');
  lines.push('stages:');

  const byPhase = registry.listByPhase();
  const phaseOrder = ['pre', 'build', 'post'] as const;

  for (const phase of phaseOrder) {
    const mods = byPhase[phase];
    if (mods.length === 0) continue;

    lines.push(`  ${phase}:`);
    for (const m of mods) {
      lines.push(`    - module: ${m.name}`);
    }
  }

  return lines.join('\n') + '\n';
}