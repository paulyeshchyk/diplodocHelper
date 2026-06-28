const contexts_template = require('../../../src/plugins/contexts/contexts.template');

describe('contexts.template', () => {
    test('INDEX_MD_DEFAULT_CONTENT should be defined', () => {
        expect(contexts_template.INDEX_MD_DEFAULT_CONTENT).toBeDefined();
    });
    test.todo('INDEX_MD_DEFAULT_CONTENT should work correctly');
    test('INDEX_YAML_LINK_TEMPLATE should be defined', () => {
        expect(contexts_template.INDEX_YAML_LINK_TEMPLATE).toBeDefined();
    });
    test.todo('INDEX_YAML_LINK_TEMPLATE should work correctly');
    test('INDEX_TAML_LINKS_TEMPLATE should be defined', () => {
        expect(contexts_template.INDEX_TAML_LINKS_TEMPLATE).toBeDefined();
    });
    test.todo('INDEX_TAML_LINKS_TEMPLATE should work correctly');
    test('TOC_YAML_LINKS_TEMPLATE should be defined', () => {
        expect(contexts_template.TOC_YAML_LINKS_TEMPLATE).toBeDefined();
    });
    test.todo('TOC_YAML_LINKS_TEMPLATE should work correctly');
    test('TOC_YAML_LINK_TEMPLATE should be defined', () => {
        expect(contexts_template.TOC_YAML_LINK_TEMPLATE).toBeDefined();
    });
    test.todo('TOC_YAML_LINK_TEMPLATE should work correctly');
});
