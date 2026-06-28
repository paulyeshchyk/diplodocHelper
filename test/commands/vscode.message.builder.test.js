const vscode_message_builder = require('../../src/commands/vscode.message.builder');

describe('vscode.message.builder', () => {
    test('MessageBuilder should be defined', () => {
        expect(vscode_message_builder.MessageBuilder).toBeDefined();
    });
    test.todo('MessageBuilder should work correctly');
    test('SectionDeleteMessageBuilder should be defined', () => {
        expect(vscode_message_builder.SectionDeleteMessageBuilder).toBeDefined();
    });
    test.todo('SectionDeleteMessageBuilder should work correctly');
    test('FileDeleteMessageBuilder should be defined', () => {
        expect(vscode_message_builder.FileDeleteMessageBuilder).toBeDefined();
    });
    test.todo('FileDeleteMessageBuilder should work correctly');
});
