const diplodoc_helper_linter_links = require('../../src/commands/diplodoc-helper.linter.links');

describe('diplodoc-helper.linter.links', () => {
    test('ux_linter_links should be defined', () => {
        expect(diplodoc_helper_linter_links.ux_linter_links).toBeDefined();
    });
    test.todo('ux_linter_links should work correctly');
    test('getLinterCachedMdFiles should be defined', () => {
        expect(diplodoc_helper_linter_links.getLinterCachedMdFiles).toBeDefined();
    });
    test.todo('getLinterCachedMdFiles should work correctly');
    test('getLinterCachedRootDir should be defined', () => {
        expect(diplodoc_helper_linter_links.getLinterCachedRootDir).toBeDefined();
    });
    test.todo('getLinterCachedRootDir should work correctly');
});
