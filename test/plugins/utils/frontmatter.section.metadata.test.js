const frontmatter_section_metadata = require('../../../src/plugins/utils/frontmatter.section.metadata');

describe('frontmatter.section.metadata', () => {
    test('getSectionMetadata should be defined', () => {
        expect(frontmatter_section_metadata.getSectionMetadata).toBeDefined();
    });
    test.todo('getSectionMetadata should work correctly');
});
