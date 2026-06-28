const yaml_base = require('../../../src/plugins/utils/yaml.base');

describe('yaml.base', () => {
    test('TocYamlEntryPatchItems should be defined', () => {
        expect(yaml_base.TocYamlEntryPatchItems).toBeDefined();
    });
    test.todo('TocYamlEntryPatchItems should work correctly');
    test('TocYamlFileCreate should be defined', () => {
        expect(yaml_base.TocYamlFileCreate).toBeDefined();
    });
    test.todo('TocYamlFileCreate should work correctly');
    test('IndexYamlFileCreate should be defined', () => {
        expect(yaml_base.IndexYamlFileCreate).toBeDefined();
    });
    test.todo('IndexYamlFileCreate should work correctly');
    test('IndexYamlEntryPatch should be defined', () => {
        expect(yaml_base.IndexYamlEntryPatch).toBeDefined();
    });
    test.todo('IndexYamlEntryPatch should work correctly');
    test('IndexMdFileCreate should be defined', () => {
        expect(yaml_base.IndexMdFileCreate).toBeDefined();
    });
    test.todo('IndexMdFileCreate should work correctly');
});
