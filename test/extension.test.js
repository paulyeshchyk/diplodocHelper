const extension = require('../src/extension');

describe('extension', () => {
    test('activate should be defined', () => {
        expect(extension.activate).toBeDefined();
    });
    test.todo('activate should work correctly');
    test('deactivate should be defined', () => {
        expect(extension.deactivate).toBeDefined();
    });
    test.todo('deactivate should work correctly');
});
