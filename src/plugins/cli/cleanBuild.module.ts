import * as fs from 'node:fs';
import { resolveBuildDir } from './module-helpers.ts';
import type { ModuleDef } from './types.ts';

export const cleanBuildModule: ModuleDef = {
  name: 'cleanBuild',
  description: 'Удаляет build/ перед сборкой',
  phase: 'pre',
  defaultOrder: 5,
  args: [],
  async load() {
    return {
      async run(opts) {
        const buildDir = resolveBuildDir(opts);
        fs.rmSync(buildDir, { recursive: true, force: true });
      },
    };
  },
};