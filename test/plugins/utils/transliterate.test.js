const transliterate = require('../../../src/plugins/utils/transliterate');

describe('transliterate', () => {
    test('diplodocTransliterate should be defined', () => {
        expect(transliterate.diplodocTransliterate).toBeDefined();
    });
    test.todo('diplodocTransliterate should work correctly');
    test('diplodocReverseTransliterate should be defined', () => {
        expect(transliterate.diplodocReverseTransliterate).toBeDefined();
    });
    test.todo('diplodocReverseTransliterate should work correctly');
});
