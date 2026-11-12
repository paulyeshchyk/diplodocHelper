import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveBuildDir } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

type InjectFn = (buildDir: string, opts: { pluginDir: string }) => {
  success: string[];
  failed: string[];
};

async function loadFn(): Promise<InjectFn> {
  const mod = await import('./feature-map.injector.ts');
  const m = mod as unknown as { runGeneration: InjectFn; default?: { runGeneration: InjectFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

function resolveFeatureMapPluginDir(): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'plugins', 'docs-registry', 'emit-feature-map'),
    path.join(process.cwd(), 'plugins', 'docs-registry', 'emit-feature-map'),
  ];
  const docsRoot = process.env.DOCS_PROJECT_ROOT;
  if (docsRoot) {
    candidates.push(
      path.join(docsRoot, 'plugins', 'docs-registry', 'emit-feature-map'),
      path.join(docsRoot, '..', 'src', 'plugins', 'docs-registry', 'emit-feature-map'),
    );
  }
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'feature-map.client.js'))) return path.resolve(c);
  }
  throw new Error(
    `featureMapInject: не удалось найти emit-feature-map (feature-map.client.js). ` +
    `Проверьте ${candidates.join(', ')} или передайте --plugin-dir=<path>`,
  );
}

export const featureMapInjectModule: ModuleDef = {
  name: 'featureMapInject',
  description: 'Инжектит CSS+JS feature-map в HTML',
  phase: 'post',
  defaultOrder: 2,
  args: [
    { name: 'pluginDir', flag: '--plugin-dir', type: 'string', description: 'Явный путь к emit-feature-map' },
  ],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const buildDir = resolveBuildDir(opts);
        const pluginDir = typeof opts.pluginDir === 'string' && opts.pluginDir.trim()
          ? path.resolve(opts.pluginDir)
          : resolveFeatureMapPluginDir();
        const results = runGeneration(buildDir, { pluginDir });
        if (results.failed.length > 0) {
          throw new Error(`featureMapInject failed: ${results.failed.join(', ')}`);
        }
      },
    };
  },
};