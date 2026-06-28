const yaml_toc_entry = require('../../../src/plugins/utils/yaml.toc.entry');

describe('yaml.toc.entry', () => {
    test('TocYamlEntryCreate should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryCreate).toBeDefined();
    });
    test.todo('TocYamlEntryCreate should work correctly');
    test('TocYamlEntryUpdateOrAppend should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryUpdateOrAppend).toBeDefined();
    });
    test.todo('TocYamlEntryUpdateOrAppend should work correctly');
    test('TocYamlEntryRemove should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryRemove).toBeDefined();
    });
    test.todo('TocYamlEntryRemove should work correctly');
    test('TocYamlEntryPatch should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryPatch).toBeDefined();
    });
    test.todo('TocYamlEntryPatch should work correctly');
    test('TocYamlEntryPatchTitle should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryPatchTitle).toBeDefined();
    });
    test.todo('TocYamlEntryPatchTitle should work correctly');
    test('TocYamlEntryPatchReference should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryPatchReference).toBeDefined();
    });
    test.todo('TocYamlEntryPatchReference should work correctly');
    test('TocYamlEntryInsertAtPosition should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryInsertAtPosition).toBeDefined();
    });
    test.todo('TocYamlEntryInsertAtPosition should work correctly');
    test('TocYamlEntryMoveWithinSameFile should be defined', () => {
        expect(yaml_toc_entry.TocYamlEntryMoveWithinSameFile).toBeDefined();
    });
    test.todo('TocYamlEntryMoveWithinSameFile should work correctly');
});
