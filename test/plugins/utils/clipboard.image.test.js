const clipboard_image = require('../../../src/plugins/utils/clipboard.image');

describe('clipboard.image', () => {
    test('getImageFromClipboard should be defined', () => {
        expect(clipboard_image.getImageFromClipboard).toBeDefined();
    });
    test.todo('getImageFromClipboard should work correctly');
});
