const mdLinks = require('../../../../../src/plugins/shared/parser/md/mdLinks');

describe('mdLinks', () => {
    test('isExternalLink should be defined', () => {
        expect(mdLinks.isExternalLink).toBeDefined();
    });
    test('positive isExternalLink mailto', () => {
        const text = 'mailto:joe.doe@mail.com';
        let result = mdLinks.isExternalLink({
            rawPath: text,
            full: '',
            isImage: false,
            text: '',
            index: 0,
        });
        expect(result).not.toBeNull();
    });
    test('positive isExternalLink http', () => {
        const text = 'http://www.lorem.ipsum.com';
        let result = mdLinks.isExternalLink({
            rawPath: text,
            full: '',
            isImage: false,
            text: '',
            index: 0,
        });
        expect(result).not.toBeNull();
    });

    // ===
    test('isRemoteOrDataUrl should be defined', () => {
        expect(mdLinks.isRemoteOrDataUrl).toBeDefined();
    });
    test('positive isRemoteOrDataUrl mailto', () => {
        const text = 'mailto:joe.doe@mail.com';
        let result = mdLinks.isRemoteOrDataUrl(text);
        expect(result).toEqual(true);
    });
    test('positive isRemoteOrDataUrl http', () => {
        const text = 'http://www.lorem.ipsum.com';
        let result = mdLinks.isRemoteOrDataUrl(text);
        expect(result).toEqual(true);
    });
    test('negative isRemoteOrDataUrl http', () => {
        const text = 'www.lorem.ipsum.com';
        let result = mdLinks.isRemoteOrDataUrl(text);
        expect(result).toEqual(false);
    });
});
