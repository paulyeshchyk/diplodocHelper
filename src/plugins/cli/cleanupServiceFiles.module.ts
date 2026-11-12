import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveBuildDir } from './module-helpers.ts';
import type { ModuleDef } from './types.ts';

const SERVICE_FILES = ['.yfm', '.yfmignore', '.yfmlint'];

export const cleanupServiceFilesModule: ModuleDef = {
  name: 'cleanupServiceFiles',
  description: 'Удаляет служебные .yfm* из build/',
  phase: 'post',
  defaultOrder: 99,
  args: [],
  async load() {
    return {
      async run(opts) {
        const buildDir = resolveBuildDir(opts);
        for (const f of SERVICE_FILES) {
          fs.rmSync(path.join(buildDir, f), { recursive: true, force: true });
        }
      },
    };
  },
};