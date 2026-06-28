const path_extract = require('../../../src/plugins/utils/path.extract');

describe('path.extract', () => {
    test('decodeImagePath should be defined', () => {
        expect(path_extract.decodeImagePath).toBeDefined();
    });
    test.todo('decodeImagePath should work correctly');
    test('normalizePathForKey should be defined', () => {
        expect(path_extract.normalizePathForKey).toBeDefined();
    });
    test.todo('normalizePathForKey should work correctly');
    test('getRelativeLink should be defined', () => {
        expect(path_extract.getRelativeLink).toBeDefined();
    });
    test.todo('getRelativeLink should work correctly');
    test('getRelativePath should be defined', () => {
        expect(path_extract.getRelativePath).toBeDefined();
    });
    test.todo('getRelativePath should work correctly');
});
