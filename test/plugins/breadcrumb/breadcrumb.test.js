const breadcrumb = require('../../../src/plugins/breadcrumb/breadcrumb');

describe('breadcrumb', () => {
    test('runGeneration should be defined', () => {
        expect(breadcrumb.runGeneration).toBeDefined();
    });
    test.todo('runGeneration should work correctly');
});
