const vscode_linter_links_picker = require('../../src/commands/vscode.linter.links.picker');

describe('vscode.linter.links.picker', () => {
    test('pickAndReplace should be defined', () => {
        expect(vscode_linter_links_picker.pickAndReplace).toBeDefined();
    });
    test.todo('pickAndReplace should work correctly');
});
