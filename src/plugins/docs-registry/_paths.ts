import * as path from 'node:path';

/**
 * Корень «проекта документации» — та директория, от которой считаются
 * `docs/`, `_registry/`, `_generated/`.
 *
 * ⚠️ `_paths.ts` грузится как ESM под нативным Node 24 (через
 * `loadESMFromCJS` при `require('./_paths.ts')` из CJS). В ESM
 * `__dirname` и `__filename` **не определены**. Поэтому этот модуль
 * **не пытается вычислить свой путь** — корень задаётся извне:
 *
 *   1. `process.env.DOCS_PROJECT_ROOT` — ставится в prelude
 *      `diplodoc-helper-cli.js` **до** первого `require('./_paths.ts')`.
 *      - из `--docs-project-root=<path>`, если флаг передан;
 *      - иначе — `findProjectRoot(__dirname_cli)` (поиск вверх до папки,
 *        содержащей `docs/`).
 *   2. Fallback — `process.cwd()`. Используется только в тестах (ts-jest
 *      запускается из корня репозитория) и при прямом импорте `_paths.ts`
 *      вне CLI. Для production-путей всегда идёт через CLI-prelude.
 *
 * ⚠️ Значения — константы времени загрузки. Если `process.env.DOCS_PROJECT_ROOT`
 * меняется позже, `_paths.ts` этого не увидит (модуль кешируется Node).
 * Тестам нужен `jest.resetModules()` или `opts.registryDir` /
 * `opts.fieldsDir` в вызывающих функциях (см. `_fields.ts`).
 */

export const PROJECT_ROOT: string = process.env.DOCS_PROJECT_ROOT
    ? path.resolve(process.env.DOCS_PROJECT_ROOT)
    : path.resolve(process.cwd());

export const DOCS_DIR: string = path.join(PROJECT_ROOT, 'docs');
export const REGISTRY_DIR: string = path.join(DOCS_DIR, '_registry');
export const GENERATED_DIR: string = path.join(DOCS_DIR, '_generated');
export const ASSETS_DIR: string = path.join(DOCS_DIR, '_assets');

// SCRIPT_DIR удалён — не читается ни одним потребителем (проверено grep),
// а вычислить его в ESM без import.meta.url (запрещён при module: "commonjs")
// невозможно.