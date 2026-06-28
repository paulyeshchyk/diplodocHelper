const yaml_toc_sort = require('../../../src/plugins/utils/yaml.toc.sort');

describe('yaml.toc.sort', () => {
    test('sortTocItems should be defined', () => {
        expect(yaml_toc_sort.sortTocItems).toBeDefined();
    });
    test.todo('sortTocItems should work correctly');
    test('compareIndexes should be defined', () => {
        expect(yaml_toc_sort.compareIndexes).toBeDefined();
    });
    test.todo('compareIndexes should work correctly');
});
