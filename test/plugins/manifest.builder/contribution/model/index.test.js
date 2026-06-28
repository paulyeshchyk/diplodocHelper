const index = require('../../../../../src/plugins/manifest.builder/contribution/model/index');

describe('index', () => {
    test('submenuItem should be defined', () => {
        expect(index.submenuItem).toBeDefined();
    });
    test.todo('submenuItem should work correctly');
    test('menuItem should be defined', () => {
        expect(index.menuItem).toBeDefined();
    });
    test.todo('menuItem should work correctly');
});
