const vscode_linter_links_findCandidateFiles = require('../../src/commands/vscode.linter.links.findCandidateFiles');

describe('vscode.linter.links.findCandidateFiles', () => {
    test('findCandidateFiles should be defined', () => {
        expect(vscode_linter_links_findCandidateFiles.findCandidateFiles).toBeDefined();
    });
    test.todo('findCandidateFiles should work correctly');
});
