const frontmatter_section_title = require('../../../src/plugins/utils/frontmatter.section.title');

describe('frontmatter.section.title', () => {
    test('composeFullTitle should be defined', () => {
        expect(frontmatter_section_title.composeFullTitle).toBeDefined();
    });
    test.todo('composeFullTitle should work correctly');
    test('composeFolderName should be defined', () => {
        expect(frontmatter_section_title.composeFolderName).toBeDefined();
    });
    test.todo('composeFolderName should work correctly');
    test('isIndexedSectionType should be defined', () => {
        expect(frontmatter_section_title.isIndexedSectionType).toBeDefined();
    });
    test.todo('isIndexedSectionType should work correctly');
});
