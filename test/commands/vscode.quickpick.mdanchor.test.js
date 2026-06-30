const vscode_quickpick_mdanchor = require('../../src/commands/vscode.quickpick.mdanchor');

describe('vscode.quickpick.mdanchor', () => {
    test('selectInsertPosition should be defined', () => {
        expect(vscode_quickpick_mdanchor.selectInsertPosition).toBeDefined();
    });
    test.todo('selectInsertPosition should work correctly');
});
