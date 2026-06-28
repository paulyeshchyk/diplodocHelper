const diplodoc_helper_file_md = require('../../src/commands/diplodoc-helper.file.md');

describe('diplodoc-helper.file.md', () => {
    test('findReferencesToMdFile should be defined', () => {
        expect(diplodoc_helper_file_md.findReferencesToMdFile).toBeDefined();
    });
    test.todo('findReferencesToMdFile should work correctly');
    test('findReferencesToMdSection should be defined', () => {
        expect(diplodoc_helper_file_md.findReferencesToMdSection).toBeDefined();
    });
    test.todo('findReferencesToMdSection should work correctly');
    test('buildMdFileReferences should be defined', () => {
        expect(diplodoc_helper_file_md.buildMdFileReferences).toBeDefined();
    });
    test.todo('buildMdFileReferences should work correctly');
});
