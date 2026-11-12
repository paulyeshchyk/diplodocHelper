import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { resolveBuildDir, resolveDocsDir, resolveProjectRoot } from './module-helpers.ts';
import type { ModuleDef } from './types.ts';

export const diplodocBuildModule: ModuleDef = {
  name: 'diplodocBuild',
  description: 'Собирает HTML через npx @diplodoc/cli',
  phase: 'build',
  defaultOrder: 10,
  args: [
    { name: 'input', flag: '--input', type: 'string', description: 'Корень docs (default: resolveDocsDir)' },
    { name: 'output', flag: '--output', type: 'string', description: 'Куда писать build (default: resolveBuildDir)' },
    { name: 'allowCustomResources', flag: '--allow-custom-resources', type: 'boolean', description: 'Передавать флаг CLI', default: true },
    { name: 'applyPresets', flag: '--apply-presets', type: 'boolean', description: 'Передавать флаг CLI', default: true },
    { name: 'quiet', flag: '--quiet', type: 'boolean', description: 'Передавать флаг CLI', default: true },
    { name: 'preset', flag: '--preset', type: 'string', description: 'Preset-имя (по умолчанию "internal")' },
  ],
  async load() {
    return {
      async run(opts) {
        const projectRoot = resolveProjectRoot(opts);
        const input = typeof opts.input === 'string' && opts.input.trim()
          ? path.resolve(opts.input)
          : resolveDocsDir(opts);
        const output = typeof opts.output === 'string' && opts.output.trim()
          ? path.resolve(opts.output)
          : resolveBuildDir(opts);
        const preset = typeof opts.preset === 'string' && opts.preset.trim()
          ? opts.preset
          : 'internal';

        const args = ['@diplodoc/cli', '-i', input, '-o', output];
        if (opts.allowCustomResources !== false) args.push('--allow-custom-resources');
        if (opts.applyPresets !== false) args.push('--apply-presets');
        if (opts.quiet !== false) args.push('--quiet');
        args.push(preset);

        const isWin = process.platform === 'win32';
        const result = spawnSync(isWin ? 'npx.cmd' : 'npx', args, {
          cwd: projectRoot,
          stdio: 'inherit',
          shell: isWin,
        });
        if (result.error) throw result.error;
        if (result.status !== 0) {
          throw new Error(`diplodocBuild: exit code ${result.status ?? 'null'}`);
        }
      },
    };
  },
};