/**
 * Cross-module cleanup sanity test.
 *
 * Живёт в `src/plugins/` (не в `abbrs/` или `terms/`), потому что:
 *   1) Проверяет **одно и то же** для двух модулей — не дублировать
 *      6 shim-путей и `allowed`-Set дважды.
 *   2) Фиксирует **завершённость Wave 4d**: удаление 6 shim-файлов
 *      (`abbrs/shared/inlineAnnotation.{mask,textRange,model}.js`
 *      и `terms/shared/inlineAnnotation.{mask,textRange,model}.js`).
 *      Если регресс — падает сразу на обоих модулях, а не на одном.
 *   3) Проверяет **shared API contract**: `abbrs/shared/index.js` и
 *      `terms/shared/index.js` обязаны экспортировать одинаковый
 *      набор (`loadTemplate`, `renderTemplate`).
 *
 * Колокация (Contributing §1.4) здесь неприменима: тест не проверяет
 * контракт одного модуля, а **инвариант между** модулями.
 *
 * Нумерация `00.5.4#20..#21` продолжает волну 00.5.4 (см.
 * `abbrs.extractor.test.ts::#01..#05`, `terms.injector.test.ts::#14..#16`,
 * `gosts.collector.test.ts::#17..#19`). Деление на два файла нарушило
 * бы «wave-scoped» нумерацию (Contributing §1.1).
 *
 * Regression: 00.5.4#20..#21.
 */

import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Wave 4d: shim removal sanity', () => {
    const SHIMS = [
        'plugins/abbrs/shared/inlineAnnotation.mask.js',
        'plugins/abbrs/shared/inlineAnnotation.textRange.js',
        'plugins/abbrs/shared/inlineAnnotation.model.js',
        'plugins/terms/shared/inlineAnnotation.mask.js',
        'plugins/terms/shared/inlineAnnotation.textRange.js',
        'plugins/terms/shared/inlineAnnotation.model.js',
    ];

    it('00.5.4#20 should have all 6 shim files removed', () => {
        for (const rel of SHIMS) {
            const full = path.join(__dirname, '..', rel);
            expect(fs.existsSync(full)).toBe(false);
        }
    });

    it('00.5.4#21 should have shared/index.js export only template API', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const abbrs = require('../plugins/abbrs/shared');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const terms = require('../plugins/terms/shared');
        const allowed = new Set(['loadTemplate', 'renderTemplate']);
        for (const key of Object.keys(abbrs)) {
            expect(allowed.has(key)).toBe(true);
        }
        for (const key of Object.keys(terms)) {
            expect(allowed.has(key)).toBe(true);
        }
    });
});