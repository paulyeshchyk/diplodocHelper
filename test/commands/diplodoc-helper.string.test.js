const diplodoc_helper_string = require('../../src/commands/diplodoc-helper.string');

describe('diplodoc-helper.string', () => {
    test('truncateMiddle should be defined', () => {
        expect(diplodoc_helper_string.truncateMiddle).toBeDefined();
    });
    test.todo('truncateMiddle should work correctly');
});
