import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArgSpec, CommonOptions, PipelineEntry } from './types.ts';

export function loadPluginConfig(pluginConfigPath: string | null): Record<string, unknown> | null {
  if (!pluginConfigPath || !fs.existsSync(pluginConfigPath)) return null;

  try {
    const content = fs.readFileSync(pluginConfigPath, 'utf8');
    const raw = pluginConfigPath.endsWith('.json')
      ? JSON.parse(content)
      : yaml.load(content);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[pipeline] не удалось прочитать ${pluginConfigPath}: ${msg}`);
    return null;
  }
}

/**
 * 4-уровневый merge. Приоритет: L2 > L1 > L3 > L4.
 *
 * - L4: ModuleDef.args[].default        — дефолт в коде (deprecated, уйдёт в Wave 5)
 * - L3: <pluginDir>/plugin.config.*     — dev override
 * - L1: <yaml>.common                   — общий для всех модулей
 * - L2: <yaml>.stages.<phase>[].options — точечно для модуля в фазе
 *
 * Резервные ключи `enabled` / `module` управляют pipeline-ом, а не модулем,
 * в opts не попадают (см. REFACTORING.md §2.5).
 */
export function mergeModuleOptions(
  entry: PipelineEntry,
  common: CommonOptions,
  pluginConfig: Record<string, unknown> | null,
  args: ReadonlyArray<ArgSpec> = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // L4
  for (const a of args) {
    if (a.name === 'enabled' || a.name === 'module') continue;
    if (a.default !== undefined) out[a.name] = a.default;
  }

  // L3
  if (pluginConfig) {
    for (const [k, v] of Object.entries(pluginConfig)) {
      if (k === 'enabled' || k === 'module') continue;
      if (v !== undefined) out[k] = v;
    }
  }

  // L1
  for (const [k, v] of Object.entries(common)) {
    if (k === 'enabled' || k === 'module') continue;
    if (v !== undefined) out[k] = v;
  }

  // L2
  if (entry.options) {
    for (const [k, v] of Object.entries(entry.options)) {
      if (k === 'enabled' || k === 'module') continue;
      if (v !== undefined) out[k] = v;
    }
  }

  return out;
}

export function isEntryEnabled(entry: PipelineEntry): boolean {
  return entry.enabled !== false;
}

export function resolveModuleConfigPath(
  projectRoot: string | null,
  moduleName: string,
): string | null {
  if (!projectRoot) return null;

  for (const base of [
    path.join(projectRoot, 'src', 'plugins', moduleName),
    path.join(projectRoot, 'plugins', moduleName),
  ]) {
    for (const f of ['plugin.config.yaml', 'plugin.config.yml', 'plugin.config.json']) {
      const c = path.join(base, f);
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}