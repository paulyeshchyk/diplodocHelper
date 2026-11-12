import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveBuildDir, resolveProjectRoot } from './module-helpers.ts';
import type { ModuleDef } from './types.ts';

export const copyMdeditFixesModule: ModuleDef = {
  name: 'copyMdeditFixes',
  description: 'Копирует mdedit_fixes в build/plugins/',
  phase: 'post',
  defaultOrder: 32,
  args: [],
  async load() {
    return {
      async run(opts) {
        const projectRoot = resolveProjectRoot(opts);
        const buildDir = resolveBuildDir(opts);

        const candidates = [
          path.join(projectRoot, 'src', 'plugins', 'mdedit_fixes'),  // dev
          path.join(projectRoot, 'plugins', 'mdedit_fixes'),         // installScripts
        ];
        const src = candidates.find(c => fs.existsSync(c));
        if (!src) {
          throw new Error(`copyMdeditFixes: mdedit_fixes не найден (пробовал: ${candidates.join(', ')})`);
        }

        const dst = path.join(buildDir, 'plugins', 'mdedit_fixes');
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.cpSync(src, dst, { recursive: true, force: true });
      },
    };
  },
};