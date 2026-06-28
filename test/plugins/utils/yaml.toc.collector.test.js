const yaml_toc_collector = require('../../../src/plugins/utils/yaml.toc.collector');

describe('yaml.toc.collector', () => {
    test('collectIndexMdFiles should be defined', () => {
        expect(yaml_toc_collector.collectIndexMdFiles).toBeDefined();
    });
    test.todo('collectIndexMdFiles should work correctly');
    test('getAllIndexMdFiles should be defined', () => {
        expect(yaml_toc_collector.getAllIndexMdFiles).toBeDefined();
    });
    test.todo('getAllIndexMdFiles should work correctly');
});
