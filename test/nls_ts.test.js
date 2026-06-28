const nls_ts = require('../src/nls_ts');

describe('nls_ts', () => {
    test('translate should be defined', () => {
        expect(nls_ts.translate).toBeDefined();
    });
    test.todo('translate should work correctly');
});
