const breadcrumb_injector = require('../../../src/plugins/breadcrumb/breadcrumb.injector');

describe('breadcrumb.injector', () => {
    test('injectScriptIntoFile should be defined', () => {
        expect(breadcrumb_injector.injectScriptIntoFile).toBeDefined();
    });
    test.todo('injectScriptIntoFile should work correctly');
});
