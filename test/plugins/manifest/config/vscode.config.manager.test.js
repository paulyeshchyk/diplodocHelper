const vscode_config_manager = require('../../../../src/plugins/manifest/config/vscode.config.manager');

describe('vscode.config.manager', () => {
    test('createConfigInVsCode should be defined', () => {
        expect(vscode_config_manager.createConfigInVsCode).toBeDefined();
    });
    test.todo('createConfigInVsCode should work correctly');
    test('DiplodocConfigSharedInstance should be defined', () => {
        expect(vscode_config_manager.DiplodocConfigSharedInstance).toBeDefined();
    });
    test.todo('DiplodocConfigSharedInstance should work correctly');
    test('setupDiplodocConfigChangeWatcher should be defined', () => {
        expect(vscode_config_manager.setupDiplodocConfigChangeWatcher).toBeDefined();
    });
    test.todo('setupDiplodocConfigChangeWatcher should work correctly');
    test('DiplodocConfigFromWorkspace should be defined', () => {
        expect(vscode_config_manager.DiplodocConfigFromWorkspace).toBeDefined();
    });
    test.todo('DiplodocConfigFromWorkspace should work correctly');
});
