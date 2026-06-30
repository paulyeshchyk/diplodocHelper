const vscode_FindFiles = require('../../src/commands/vscode.FindFiles');

describe('vscode.FindFiles', () => {
    test('FindMdFiles should be defined', () => {
        expect(vscode_FindFiles.FindMdFiles).toBeDefined();
    });
    test.todo('FindMdFiles should work correctly');
});
