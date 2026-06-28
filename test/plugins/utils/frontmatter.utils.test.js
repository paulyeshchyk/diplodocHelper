const frontmatter_utils = require('../../../src/plugins/utils/frontmatter.utils');

describe('frontmatter.utils', () => {
    test('parse should be defined', () => {
        expect(frontmatter_utils.parse).toBeDefined();
    });
    test.todo('parse should work correctly');
    test('stringify should be defined', () => {
        expect(frontmatter_utils.stringify).toBeDefined();
    });
    test.todo('stringify should work correctly');
    test('get should be defined', () => {
        expect(frontmatter_utils.get).toBeDefined();
    });
    test.todo('get should work correctly');
    test('update should be defined', () => {
        expect(frontmatter_utils.update).toBeDefined();
    });
    test.todo('update should work correctly');
    test('remove should be defined', () => {
        expect(frontmatter_utils.remove).toBeDefined();
    });
    test.todo('remove should work correctly');
    test('getTitleFromMetadata should be defined', () => {
        expect(frontmatter_utils.getTitleFromMetadata).toBeDefined();
    });
    test.todo('getTitleFromMetadata should work correctly');
});
