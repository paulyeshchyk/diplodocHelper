const frontmatter_templates = require('../../../src/plugins/model/frontmatter.templates');

describe('frontmatter.templates', () => {
    test('TEMPLATE_FINAL_TITLE should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_FINAL_TITLE).toBeDefined();
    });
    test.todo('TEMPLATE_FINAL_TITLE should work correctly');
    test('TEMPLATE_INDEX_MD should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_INDEX_MD).toBeDefined();
    });
    test.todo('TEMPLATE_INDEX_MD should work correctly');
    test('TEMPLATE_INDEX_YAML should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_INDEX_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_INDEX_YAML should work correctly');
    test('TEMPLATE_TOC_YAML should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_TOC_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_TOC_YAML should work correctly');
    test('TEMPLATE_PARENT_TOC_YAML should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_PARENT_TOC_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_PARENT_TOC_YAML should work correctly');
    test('TEMPLATE_FOLDER_NAME should be defined', () => {
        expect(frontmatter_templates.TEMPLATE_FOLDER_NAME).toBeDefined();
    });
    test.todo('TEMPLATE_FOLDER_NAME should work correctly');
});
