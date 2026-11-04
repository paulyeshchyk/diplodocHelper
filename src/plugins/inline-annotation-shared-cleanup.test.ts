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