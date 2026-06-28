const diplodoc_helper_cli = require('../../src/plugins/diplodoc-helper-cli');

describe('diplodoc-helper-cli', () => {
    test('generateHelpMap should be defined', () => {
        expect(diplodoc_helper_cli.generateHelpMap).toBeDefined();
    });
    test.todo('generateHelpMap should work correctly');
    test('generateContexts should be defined', () => {
        expect(diplodoc_helper_cli.generateContexts).toBeDefined();
    });
    test.todo('generateContexts should work correctly');
    test('generateBreadcrumb should be defined', () => {
        expect(diplodoc_helper_cli.generateBreadcrumb).toBeDefined();
    });
    test.todo('generateBreadcrumb should work correctly');
    test('generateTocCleanMode should be defined', () => {
        expect(diplodoc_helper_cli.generateTocCleanMode).toBeDefined();
    });
    test.todo('generateTocCleanMode should work correctly');
    test('reindexFigures should be defined', () => {
        expect(diplodoc_helper_cli.reindexFigures).toBeDefined();
    });
    test.todo('reindexFigures should work correctly');
});
