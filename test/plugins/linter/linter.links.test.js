const linter_links = require('../../../src/plugins/linter/linter.links');

describe('linter.links', () => {
    test('lintInternalLinks should be defined', () => {
        expect(linter_links.lintInternalLinks).toBeDefined();
    });
    test.todo('lintInternalLinks should work correctly');
});
