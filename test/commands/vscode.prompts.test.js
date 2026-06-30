const vscode_prompts = require('../../src/commands/vscode.prompts');

describe('vscode.prompts', () => {
    test('promptSection should be defined', () => {
        expect(vscode_prompts.promptSection).toBeDefined();
    });
    test.todo('promptSection should work correctly');
    test('promptSectionType should be defined', () => {
        expect(vscode_prompts.promptSectionType).toBeDefined();
    });
    test.todo('promptSectionType should work correctly');
    test('promptSectionName should be defined', () => {
        expect(vscode_prompts.promptSectionName).toBeDefined();
    });
    test.todo('promptSectionName should work correctly');
    test('promptSectionIndex should be defined', () => {
        expect(vscode_prompts.promptSectionIndex).toBeDefined();
    });
    test.todo('promptSectionIndex should work correctly');
    test('ShowSectionNameSelector should be defined', () => {
        expect(vscode_prompts.ShowSectionNameSelector).toBeDefined();
    });
    test.todo('ShowSectionNameSelector should work correctly');
    test('ShowSectionTypeSelector should be defined', () => {
        expect(vscode_prompts.ShowSectionTypeSelector).toBeDefined();
    });
    test.todo('ShowSectionTypeSelector should work correctly');
});
