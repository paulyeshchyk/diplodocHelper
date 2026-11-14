// src/contrib/internal-handlers.test.ts

import { describe, expect, it } from '@jest/globals';
import { INTERNAL_HANDLERS } from './internal-handlers.ts';

describe('INTERNAL_HANDLERS', () => {
    it('00.10.5#01 ux-linter.pickAndReplace зарегистрирован', () => {
        expect(typeof INTERNAL_HANDLERS['ux-linter.pickAndReplace']).toBe('function');
    });

    it('00.10.5#02 не пересекается с COMMANDS (не в манифесте)', () => {
        for (const id of Object.keys(INTERNAL_HANDLERS)) {
            expect(id.startsWith('ux-')).toBe(true);
        }
    });
});