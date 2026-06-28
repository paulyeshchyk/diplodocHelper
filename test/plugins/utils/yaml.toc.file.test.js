const yaml_toc_file = require('../../../src/plugins/utils/yaml.toc.file');

describe('yaml.toc.file', () => {
    test('TocYamlFileLoad should be defined', () => {
        expect(yaml_toc_file.TocYamlFileLoad).toBeDefined();
    });
    test.todo('TocYamlFileLoad should work correctly');
    test('TocYamlFileSave should be defined', () => {
        expect(yaml_toc_file.TocYamlFileSave).toBeDefined();
    });
    test.todo('TocYamlFileSave should work correctly');
});
