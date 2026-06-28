const path_directory = require('../../../src/plugins/utils/path.directory');

describe('path.directory', () => {
    test('isValidName should be defined', () => {
        expect(path_directory.isValidName).toBeDefined();
    });
    test.todo('isValidName should work correctly');
    test('canCreateFolder should be defined', () => {
        expect(path_directory.canCreateFolder).toBeDefined();
    });
    test.todo('canCreateFolder should work correctly');
    test('createDirectory should be defined', () => {
        expect(path_directory.createDirectory).toBeDefined();
    });
    test.todo('createDirectory should work correctly');
    test('isEmptyDirectory should be defined', () => {
        expect(path_directory.isEmptyDirectory).toBeDefined();
    });
    test.todo('isEmptyDirectory should work correctly');
    test('cleanupEmptyDirectories should be defined', () => {
        expect(path_directory.cleanupEmptyDirectories).toBeDefined();
    });
    test.todo('cleanupEmptyDirectories should work correctly');
    test('isDiplodocSection should be defined', () => {
        expect(path_directory.isDiplodocSection).toBeDefined();
    });
    test.todo('isDiplodocSection should work correctly');
    test('isLanguageRoot should be defined', () => {
        expect(path_directory.isLanguageRoot).toBeDefined();
    });
    test.todo('isLanguageRoot should work correctly');
    test('getLanguageRoot should be defined', () => {
        expect(path_directory.getLanguageRoot).toBeDefined();
    });
    test.todo('getLanguageRoot should work correctly');
});
