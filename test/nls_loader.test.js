const nls_loader = require('../src/nls_loader');

describe('nls_loader', () => {
    test('initNls should be defined', () => {
        expect(nls_loader.initNls).toBeDefined();
    });
    test.todo('initNls should work correctly');
    test('translate should be defined', () => {
        expect(nls_loader.translate).toBeDefined();
    });
    test.todo('translate should work correctly');
});
