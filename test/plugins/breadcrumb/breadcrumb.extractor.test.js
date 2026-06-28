const breadcrumb_extractor = require('../../../src/plugins/breadcrumb/breadcrumb.extractor');

describe('breadcrumb.extractor', () => {
    test('extractTitleFromHtml should be defined', () => {
        expect(breadcrumb_extractor.extractTitleFromHtml).toBeDefined();
    });
    test.todo('extractTitleFromHtml should work correctly');
    test('generateBreadcrumbScript should be defined', () => {
        expect(breadcrumb_extractor.generateBreadcrumbScript).toBeDefined();
    });
    test.todo('generateBreadcrumbScript should work correctly');
});
