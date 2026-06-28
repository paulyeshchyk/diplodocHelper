const contributionInjector = require('../../../../src/plugins/manifest.builder/contribution/contributionInjector');

describe('contributionInjector', () => {
    test('contributionInject should be defined', () => {
        expect(contributionInjector.contributionInject).toBeDefined();
    });
    test.todo('contributionInject should work correctly');
    test('ConfigData should be defined', () => {
        expect(contributionInjector.ConfigData).toBeDefined();
    });
    test.todo('ConfigData should work correctly');
});
