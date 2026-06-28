const html_utils = require('../../../src/plugins/utils/html.utils');

describe('html.utils', () => {
    test('isHtmlFile should be defined', () => {
        expect(html_utils.isHtmlFile).toBeDefined();
    });
    test.todo('isHtmlFile should work correctly');
    test('isRootIndex should be defined', () => {
        expect(html_utils.isRootIndex).toBeDefined();
    });
    test.todo('isRootIndex should work correctly');
});
