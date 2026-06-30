const diplodoc_helper_breadCrumb_Generate = require('../../src/commands/diplodoc-helper.breadCrumb.Generate');

describe('diplodoc-helper.breadCrumb.Generate', () => {
    test('ux_breadcrumbs_generate should be defined', () => {
        expect(diplodoc_helper_breadCrumb_Generate.ux_breadcrumbs_generate).toBeDefined();
    });
    test.todo('ux_breadcrumbs_generate should work correctly');
    test('runGeneration should be defined', () => {
        expect(diplodoc_helper_breadCrumb_Generate.runGeneration).toBeDefined();
    });
    test.todo('runGeneration should work correctly');
});
