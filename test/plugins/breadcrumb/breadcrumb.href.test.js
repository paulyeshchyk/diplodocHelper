const breadcrumb_href = require('../../../src/plugins/breadcrumb/breadcrumb.href');

describe('breadcrumb.href', () => {
    test('isFileProtocol should be defined', () => {
        expect(breadcrumb_href.isFileProtocol).toBeDefined();
    });
    test.todo('isFileProtocol should work correctly');
    test('buildBreadcrumbHref should be defined', () => {
        expect(breadcrumb_href.buildBreadcrumbHref).toBeDefined();
    });
    test.todo('buildBreadcrumbHref should work correctly');
});
