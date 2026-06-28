const md_index_entry = require('../../../src/plugins/utils/md.index.entry');

describe('md.index.entry', () => {
    test('IndexMdEntryReadIndex should be defined', () => {
        expect(md_index_entry.IndexMdEntryReadIndex).toBeDefined();
    });
    test.todo('IndexMdEntryReadIndex should work correctly');
    test('IndexMdEntryReadTitle should be defined', () => {
        expect(md_index_entry.IndexMdEntryReadTitle).toBeDefined();
    });
    test.todo('IndexMdEntryReadTitle should work correctly');
    test('IndexMdEntryReadSectionType should be defined', () => {
        expect(md_index_entry.IndexMdEntryReadSectionType).toBeDefined();
    });
    test.todo('IndexMdEntryReadSectionType should work correctly');
});
