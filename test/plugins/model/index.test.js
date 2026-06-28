const index = require('../../../src/plugins/model/index');

describe('index', () => {
    test('TEMPLATE_FINAL_TITLE should be defined', () => {
        expect(index.TEMPLATE_FINAL_TITLE).toBeDefined();
    });
    test.todo('TEMPLATE_FINAL_TITLE should work correctly');
    test('TEMPLATE_INDEX_MD should be defined', () => {
        expect(index.TEMPLATE_INDEX_MD).toBeDefined();
    });
    test.todo('TEMPLATE_INDEX_MD should work correctly');
    test('TEMPLATE_INDEX_YAML should be defined', () => {
        expect(index.TEMPLATE_INDEX_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_INDEX_YAML should work correctly');
    test('TEMPLATE_TOC_YAML should be defined', () => {
        expect(index.TEMPLATE_TOC_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_TOC_YAML should work correctly');
    test('TEMPLATE_PARENT_TOC_YAML should be defined', () => {
        expect(index.TEMPLATE_PARENT_TOC_YAML).toBeDefined();
    });
    test.todo('TEMPLATE_PARENT_TOC_YAML should work correctly');
    test('TEMPLATE_FOLDER_NAME should be defined', () => {
        expect(index.TEMPLATE_FOLDER_NAME).toBeDefined();
    });
    test.todo('TEMPLATE_FOLDER_NAME should work correctly');
    test('sectionTypes should be defined', () => {
        expect(index.sectionTypes).toBeDefined();
    });
    test.todo('sectionTypes should work correctly');
});
