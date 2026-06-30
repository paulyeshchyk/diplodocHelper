const diplodoc_helper_image_PasteFromClipboard = require('../../src/commands/diplodoc-helper.image.PasteFromClipboard');

describe('diplodoc-helper.image.PasteFromClipboard', () => {
    test('ux_image_paste_clipboard should be defined', () => {
        expect(diplodoc_helper_image_PasteFromClipboard.ux_image_paste_clipboard).toBeDefined();
    });
    test.todo('ux_image_paste_clipboard should work correctly');
});
