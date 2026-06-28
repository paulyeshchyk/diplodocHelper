const diplodoc_helper_fs_access = require('../../src/commands/diplodoc-helper.fs.access');

describe('diplodoc-helper.fs.access', () => {
    test('checkDeleteAccess should be defined', () => {
        expect(diplodoc_helper_fs_access.checkDeleteAccess).toBeDefined();
    });
    test.todo('checkDeleteAccess should work correctly');
    test('checkWriteAccess should be defined', () => {
        expect(diplodoc_helper_fs_access.checkWriteAccess).toBeDefined();
    });
    test.todo('checkWriteAccess should work correctly');
    test('computeUpdatedLinks should be defined', () => {
        expect(diplodoc_helper_fs_access.computeUpdatedLinks).toBeDefined();
    });
    test.todo('computeUpdatedLinks should work correctly');
});
