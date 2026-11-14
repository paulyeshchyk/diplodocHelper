// src/commands/diplodoc-helper.term.Add.test.ts

import { describe, expect, it } from '@jest/globals';

describe('ux_term_add — smoke', () => {
    it('00.12.3#01 без редактора → сообщение об ошибке, no throw', async () => {
        const { ux_term_add } = require('./diplodoc-helper.term.Add.js');
        // vscode.window.activeTextEditor = undefined (default mock)
        await expect(ux_term_add()).resolves.toBeUndefined();
    });
});