const helpmap = require('../../../src/plugins/helpMap/helpmap');

describe('helpmap', () => {
    test('runGeneration should be defined', () => {
        expect(helpmap.runGeneration).toBeDefined();
    });
    test.todo('runGeneration should work correctly');
});
