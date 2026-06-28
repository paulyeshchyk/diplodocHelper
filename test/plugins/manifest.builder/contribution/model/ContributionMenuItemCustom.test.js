const ContributionMenuItemCustom = require('../../../../../src/plugins/manifest.builder/contribution/model/ContributionMenuItemCustom');

describe('ContributionMenuItemCustom', () => {
    test('submenuItem should be defined', () => {
        expect(ContributionMenuItemCustom.submenuItem).toBeDefined();
    });
    test.todo('submenuItem should work correctly');
    test('menuItem should be defined', () => {
        expect(ContributionMenuItemCustom.menuItem).toBeDefined();
    });
    test.todo('menuItem should work correctly');
});
