const md_index_file = require('../../../src/plugins/utils/md.index.file');

describe('md.index.file', () => {
    test('IndexMdUpsert should be defined', () => {
        expect(md_index_file.IndexMdUpsert).toBeDefined();
    });
    test.todo('IndexMdUpsert should work correctly');
    test('IndexMdFileRead should be defined', () => {
        expect(md_index_file.IndexMdFileRead).toBeDefined();
    });
    test.todo('IndexMdFileRead should work correctly');
    test('IndexMdFilePatch should be defined', () => {
        expect(md_index_file.IndexMdFilePatch).toBeDefined();
    });
    test.todo('IndexMdFilePatch should work correctly');
});
