const md_links_update = require('../../../src/plugins/utils/md.links.update');

describe('md.links.update', () => {
    test('parseMarkdownLinks should be defined', () => {
        expect(md_links_update.parseMarkdownLinks).toBeDefined();
    });
    test.todo('parseMarkdownLinks should work correctly');
    test('splitPathQueryHash should be defined', () => {
        expect(md_links_update.splitPathQueryHash).toBeDefined();
    });
    test.todo('splitPathQueryHash should work correctly');
    test('isInsideRenamedFolder should be defined', () => {
        expect(md_links_update.isInsideRenamedFolder).toBeDefined();
    });
    test.todo('isInsideRenamedFolder should work correctly');
    test('getNewAbsoluteTarget should be defined', () => {
        expect(md_links_update.getNewAbsoluteTarget).toBeDefined();
    });
    test.todo('getNewAbsoluteTarget should work correctly');
    test('buildMarkdownLink should be defined', () => {
        expect(md_links_update.buildMarkdownLink).toBeDefined();
    });
    test.todo('buildMarkdownLink should work correctly');
});
