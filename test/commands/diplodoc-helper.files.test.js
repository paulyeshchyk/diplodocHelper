const diplodoc_helper_files = require('../../src/commands/diplodoc-helper.files');

describe('diplodoc-helper.files', () => {
    test('isTargetInDeletedTree should be defined', () => {
        expect(diplodoc_helper_files.isTargetInDeletedTree).toBeDefined();
    });
    test.todo('isTargetInDeletedTree should work correctly');
    test('findDirectories should be defined', () => {
        expect(diplodoc_helper_files.findDirectories).toBeDefined();
    });
    test.todo('findDirectories should work correctly');
    test('findFiles should be defined', () => {
        expect(diplodoc_helper_files.findFiles).toBeDefined();
    });
    test.todo('findFiles should work correctly');
    test('removeFileOrDirectory should be defined', () => {
        expect(diplodoc_helper_files.removeFileOrDirectory).toBeDefined();
    });
    test.todo('removeFileOrDirectory should work correctly');
});
