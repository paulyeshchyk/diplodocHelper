const yaml_index_entry = require('../../../src/plugins/utils/yaml.index.entry');

describe('yaml.index.entry', () => {
    test('IndexYamlEntryPatchHRef should be defined', () => {
        expect(yaml_index_entry.IndexYamlEntryPatchHRef).toBeDefined();
    });
    test.todo('IndexYamlEntryPatchHRef should work correctly');
    test('IndexYamlEntryPatchSection should be defined', () => {
        expect(yaml_index_entry.IndexYamlEntryPatchSection).toBeDefined();
    });
    test.todo('IndexYamlEntryPatchSection should work correctly');
});
