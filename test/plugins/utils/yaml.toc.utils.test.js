const yaml_toc_utils = require('../../../src/plugins/utils/yaml.toc.utils');

describe('yaml.toc.utils', () => {
    test('indentedTocEntry should be defined', () => {
        expect(yaml_toc_utils.indentedTocEntry).toBeDefined();
    });
    test.todo('indentedTocEntry should work correctly');
    test('getTocIndentation should be defined', () => {
        expect(yaml_toc_utils.getTocIndentation).toBeDefined();
    });
    test.todo('getTocIndentation should work correctly');
    test('normalizeEmptyLines should be defined', () => {
        expect(yaml_toc_utils.normalizeEmptyLines).toBeDefined();
    });
    test.todo('normalizeEmptyLines should work correctly');
    test('getIndexFromBlock should be defined', () => {
        expect(yaml_toc_utils.getIndexFromBlock).toBeDefined();
    });
    test.todo('getIndexFromBlock should work correctly');
    test('splitTocIntoBlocks should be defined', () => {
        expect(yaml_toc_utils.splitTocIntoBlocks).toBeDefined();
    });
    test.todo('splitTocIntoBlocks should work correctly');
});
