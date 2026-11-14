const _ontexts = require('../../../src/plugins/contexts/contexts');

describe('contexts', () => {
    test('runGeneration should be defined', () => {
        expect(_ontexts.runGeneration).toBeDefined();
    });
    test.todo('runGeneration should work correctly');
});
