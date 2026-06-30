const vscode_prompts_imagePicker = require('../../src/commands/vscode.prompts.imagePicker');

describe('vscode.prompts.imagePicker', () => {
    test('showImagePicker should be defined', () => {
        expect(vscode_prompts_imagePicker.showImagePicker).toBeDefined();
    });
    test.todo('showImagePicker should work correctly');
});
