import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Резолверы путей: корень проекта, конфиг, L3-конфиг плагина.
 */

/**
 * Walk up от `startDir` до первого каталога с `package.json`.
 * Возвращает абсолютный путь или `null`, если дошли до FS-root.
 */
export function findProjectRoot(startDir: string): string | null {
  let cur = path.resolve(startDir);
  while (cur && cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'package.json'))) return cur;
    cur = path.dirname(cur);
  }
  return null;
}

/**
 * Резолюция config-файла. Приоритет:
 *   1. `--config=<path>` (абсолютный или cwd-relative);
 *   2. `PLUGINS_CONFIG_PATH` (env);
 *   3. `<projectRoot>/plugins.config.{yaml,yml,json}`;
 *   4. `null` — вызывающая сторона использует `DEFAULT_PIPELINE`.
 *
 * Возвращает абсолютный путь или `null`.
 */
export function resolveConfigPath(
  cliConfig: string | null | undefined,
  projectRoot: string | null,
): string | null {
  if (cliConfig) return path.resolve(cliConfig);

  const envConfig = process.env.PLUGINS_CONFIG_PATH;
  if (envConfig && envConfig.trim()) return path.resolve(envConfig);

  if (projectRoot) {
    for (const name of ['plugins.config.yaml', 'plugins.config.yml', 'plugins.config.json']) {
      const candidate = path.join(projectRoot, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

/**
 * L3-конфиг плагина.
 *
 * Приоритет (dev > runtime):
 *   1. `<projectRoot>/src/plugins/<name>/plugin.config.{yaml,yml,json}`;
 *   2. `<projectRoot>/plugins/<name>/plugin.config.{yaml,yml,json}`.
 *
 * Возвращает абсолютный путь или `null` (нет L3).
 */
export function resolvePluginConfigPath(
  projectRoot: string | null,
  moduleName: string,
): string | null {
  if (!projectRoot) return null;

  const candidates: string[] = [];
  for (const base of [
    path.join(projectRoot, 'src', 'plugins', moduleName),
    path.join(projectRoot, 'plugins', moduleName),
  ]) {
    for (const f of ['plugin.config.yaml', 'plugin.config.yml', 'plugin.config.json']) {
      candidates.push(path.join(base, f));
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}