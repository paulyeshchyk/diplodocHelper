const contributionBuilder = require('../../../../src/plugins/manifest.builder/contribution/contributionBuilder');

describe('contributionBuilder', () => {
    test('buildContributes should be defined', () => {
        expect(contributionBuilder.buildContributes).toBeDefined();
    });
    test.todo('buildContributes should work correctly');
});
