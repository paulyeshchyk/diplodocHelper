const vscode_quickpick_mdhierarchy = require('../../src/commands/vscode.quickpick.mdhierarchy');

describe('vscode.quickpick.mdhierarchy', () => {
    test('selectTargetDirectory should be defined', () => {
        expect(vscode_quickpick_mdhierarchy.selectTargetDirectory).toBeDefined();
    });
    test.todo('selectTargetDirectory should work correctly');
    test('selectTargetDirectoryWithCandidates should be defined', () => {
        expect(vscode_quickpick_mdhierarchy.selectTargetDirectoryWithCandidates).toBeDefined();
    });
    test.todo('selectTargetDirectoryWithCandidates should work correctly');
});
