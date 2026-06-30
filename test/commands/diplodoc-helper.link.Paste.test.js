const diplodoc_helper_link_Paste = require('../../src/commands/diplodoc-helper.link.Paste');

describe('diplodoc-helper.link.Paste', () => {
    test('ux_link_paste should be defined', () => {
        expect(diplodoc_helper_link_Paste.ux_link_paste).toBeDefined();
    });
    test.todo('ux_link_paste should work correctly');
    test('parseClipboardLink should be defined', () => {
        expect(diplodoc_helper_link_Paste.parseClipboardLink).toBeDefined();
    });
    test.todo('parseClipboardLink should work correctly');
});
