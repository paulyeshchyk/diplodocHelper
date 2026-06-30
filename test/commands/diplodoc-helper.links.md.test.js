const diplodoc_helper_links_md = require('../../src/commands/diplodoc-helper.links.md');

describe('diplodoc-helper.links.md', () => {
    test('updateLinksAfterDelete should be defined', () => {
        expect(diplodoc_helper_links_md.updateLinksAfterDelete).toBeDefined();
    });
    test.todo('updateLinksAfterDelete should work correctly');
    test('updateLinksAfterRename should be defined', () => {
        expect(diplodoc_helper_links_md.updateLinksAfterRename).toBeDefined();
    });
    test.todo('updateLinksAfterRename should work correctly');
    test('updateLinksInContent should be defined', () => {
        expect(diplodoc_helper_links_md.updateLinksInContent).toBeDefined();
    });
    test.todo('updateLinksInContent should work correctly');
    test('parseMarkdownLinks should be defined', () => {
        expect(diplodoc_helper_links_md.parseMarkdownLinks).toBeDefined();
    });
    test.todo('parseMarkdownLinks should work correctly');
    test('splitMdPathQueryHash should be defined', () => {
        expect(diplodoc_helper_links_md.splitMdPathQueryHash).toBeDefined();
    });
    test.todo('splitMdPathQueryHash should work correctly');
});
