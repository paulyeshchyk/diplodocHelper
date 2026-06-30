const diplodoc_helper_context_Generate = require('../../src/commands/diplodoc-helper.context.Generate');

describe('diplodoc-helper.context.Generate', () => {
    test('ux_context_run_generation should be defined', () => {
        expect(diplodoc_helper_context_Generate.ux_context_run_generation).toBeDefined();
    });
    test.todo('ux_context_run_generation should work correctly');
    test('runGeneration should be defined', () => {
        expect(diplodoc_helper_context_Generate.runGeneration).toBeDefined();
    });
    test.todo('runGeneration should work correctly');
});
