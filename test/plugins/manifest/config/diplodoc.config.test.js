const diplodoc_config = require('../../../../src/plugins/manifest/config/diplodoc.config');

describe('diplodoc.config', () => {
    test('DefaultDiplodocConfig should be defined', () => {
        expect(diplodoc_config.DefaultDiplodocConfig).toBeDefined();
    });
    test.todo('DefaultDiplodocConfig should work correctly');
    test('DiplodocConfigFromJson should be defined', () => {
        expect(diplodoc_config.DiplodocConfigFromJson).toBeDefined();
    });
    test.todo('DiplodocConfigFromJson should work correctly');
    test('DiplodocConfigFromWorkspace should be defined', () => {
        expect(diplodoc_config.DiplodocConfigFromWorkspace).toBeDefined();
    });
    test.todo('DiplodocConfigFromWorkspace should work correctly');
    test('DiplodocConfigFromCli should be defined', () => {
        expect(diplodoc_config.DiplodocConfigFromCli).toBeDefined();
    });
    test.todo('DiplodocConfigFromCli should work correctly');
    test('DiplodocConfigProxy should be defined', () => {
        expect(diplodoc_config.DiplodocConfigProxy).toBeDefined();
    });
    test.todo('DiplodocConfigProxy should work correctly');
});
