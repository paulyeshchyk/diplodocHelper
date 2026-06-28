const breadcrumb_collector = require('../../../src/plugins/breadcrumb/breadcrumb.collector');

describe('breadcrumb.collector', () => {
    test('walkHtmlFiles should be defined', () => {
        expect(breadcrumb_collector.walkHtmlFiles).toBeDefined();
    });
    test.todo('walkHtmlFiles should work correctly');
    test('walkHtmlFilesBuildTitleMap should be defined', () => {
        expect(breadcrumb_collector.walkHtmlFilesBuildTitleMap).toBeDefined();
    });
    test.todo('walkHtmlFilesBuildTitleMap should work correctly');
});
