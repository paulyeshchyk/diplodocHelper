const contributionCompiler = require('../../../../src/plugins/manifest.builder/contribution/contributionCompiler');

describe('contributionCompiler', () => {
    test('compileContribution should be defined', () => {
        expect(contributionCompiler.compileContribution).toBeDefined();
    });
    test.todo('compileContribution should work correctly');
});
