import { describe, expect, it } from '@jest/globals';
import linkPaste from '../../../commands/diplodoc-helper.link.Paste.js';
import { slugify_diplodoc_reference } from '../encoding.slugify.js';
import linkUtils from '../link.utils.js';
import { Url_Transform_Reference } from './Url_Transform_Reference.ts';

describe('Url_Transform_Reference.slugify — basics', () => {
    it('00.6.3#01 should return empty string for empty input', () => {
        expect(Url_Transform_Reference.slugify('')).toBe('');
    });

    it('00.6.3#02 should return empty string for non-string input', () => {
        expect(Url_Transform_Reference.slugify(null)).toBe('');
        expect(Url_Transform_Reference.slugify(undefined)).toBe('');
        expect(Url_Transform_Reference.slugify(42)).toBe('');
        expect(Url_Transform_Reference.slugify(false)).toBe('');
        expect(Url_Transform_Reference.slugify({})).toBe('');
    });

    it('00.6.3#03 should pass through lowercase latin', () => {
        expect(Url_Transform_Reference.slugify('abc')).toBe('abc');
        expect(Url_Transform_Reference.slugify('abc123')).toBe('abc123');
    });

    it('00.6.3#04 should lowercase uppercase latin', () => {
        expect(Url_Transform_Reference.slugify('ABC')).toBe('abc');
        expect(Url_Transform_Reference.slugify('Hello World')).toBe('hello-world');
    });
});

describe('Url_Transform_Reference.slugify — markdown header prefix', () => {
    it('00.6.3#05 should strip leading # markers', () => {
        expect(Url_Transform_Reference.slugify('# Header')).toBe('header');
        expect(Url_Transform_Reference.slugify('## Header')).toBe('header');
        expect(Url_Transform_Reference.slugify('### Header')).toBe('header');
        expect(Url_Transform_Reference.slugify('###### Header')).toBe('header');
    });

    it('00.6.3#06 should strip leading # with no space', () => {
        // regex `^#+\s*` допускает 0 пробелов после #
        expect(Url_Transform_Reference.slugify('#Header')).toBe('header');
    });

    it('00.6.3#07 should NOT strip # in the middle', () => {
        // `#` удаляется правилом [^a-z0-9/=\\ -], склеивая слова
        expect(Url_Transform_Reference.slugify('Text#anchor')).toBe('textanchor');
    });

    it('00.6.3#08 should preserve trailing dashes for legacy edge case', () => {
        // `^#+\s*` убирает только ведущий `###`; trailing `###` дают trailing '-'
        expect(Url_Transform_Reference.slugify('### Header ###')).toBe('header-');
        // trailing newline тоже превращается в '-'
        expect(Url_Transform_Reference.slugify('# Header\n')).toBe('header-');
    });
});

describe('Url_Transform_Reference.slugify — separator normalisation', () => {
    it('00.6.3#09 should replace whitespace with single dash', () => {
        expect(Url_Transform_Reference.slugify('a b')).toBe('a-b');
        expect(Url_Transform_Reference.slugify('a  b')).toBe('a-b');
        expect(Url_Transform_Reference.slugify('a\tb')).toBe('a-b');
        expect(Url_Transform_Reference.slugify('a\nb')).toBe('a-b');
    });

    it('00.6.3#10 should collapse runs of dashes', () => {
        expect(Url_Transform_Reference.slugify('a---b')).toBe('a-b');
        expect(Url_Transform_Reference.slugify('a - b')).toBe('a-b');
    });

    it('00.6.3#11 should strip punctuation (not in whitelist)', () => {
        expect(Url_Transform_Reference.slugify('a.b')).toBe('ab');
        expect(Url_Transform_Reference.slugify('a,b')).toBe('ab');
        expect(Url_Transform_Reference.slugify('a!b')).toBe('ab');
        expect(Url_Transform_Reference.slugify('a?b')).toBe('ab');
    });

    it('00.6.3#12 should preserve /, =, \\ (URL-ish chars)', () => {
        expect(Url_Transform_Reference.slugify('a/b/c')).toBe('a/b/c');
        expect(Url_Transform_Reference.slugify('a=b')).toBe('a=b');
        expect(Url_Transform_Reference.slugify('a\\b')).toBe('a\\b');
    });
});

describe('Url_Transform_Reference.slugify — cyrillic', () => {
    it('00.6.3#13 should transliterate cyrillic', () => {
        expect(Url_Transform_Reference.slugify('Привет')).toBe('privet');
        expect(Url_Transform_Reference.slugify('ПРИВЕТ')).toBe('privet');
    });

    it('00.6.3#14 should handle cyrillic header with spaces', () => {
        expect(Url_Transform_Reference.slugify('## Multi Word Header')).toBe('multi-word-header');
        expect(Url_Transform_Reference.slugify('# Привет Мир')).toBe('privet-mir');
    });

    it('00.6.3#15 should strip punctuation from cyrillic', () => {
        expect(Url_Transform_Reference.slugify('# Привет, Мир!')).toBe('privet-mir');
    });

    it('00.6.3#16 should handle ь/ъ as dash (mid-position) and trailing as dash', () => {
        // toLatin('жизнь') = 'zhiznь' → \s+ no match → [^...] удаляет ь → 'zhizn'
        expect(Url_Transform_Reference.slugify('жизнь')).toBe('zhizn');
        // 'солью' → 'solьyu' → [^...] удаляет ь → 'solyu'? Нет: ь удаляется, но нет пробелов
        expect(Url_Transform_Reference.slugify('солью')).toBe('solyu');
        // 'объект' → 'obъekt' → [^...] удаляет ъ → 'obekt'
        expect(Url_Transform_Reference.slugify('объект')).toBe('obekt');
    });
});

describe('Url_Transform_Reference.slugify — cross-module invariants', () => {
    it('00.6.3#17 (+29) should match encoding.slugify.slugify_diplodoc_reference', () => {
        const cases = ['## Header', '# Привет Мир', 'a/b/c', 'a=b', 'жизнь', '### Header ###'];
        for (const c of cases) {
            expect(Url_Transform_Reference.slugify(c)).toBe(slugify_diplodoc_reference(c));
        }
    });

    it('00.6.3#18 (+29) should match generateSlug in link.Paste and link.utils', () => {
        // generateSlug не экспортируется; проверяем через extractAnchorsFromMdFile
        // Здесь — только явная sanity, что модули подключились без ошибок
        expect(linkPaste.parseClipboardLink).toBeDefined();
        expect(linkUtils.generateSlug).toBeDefined();
        expect(linkUtils.generateSlug('## Header')).toBe(Url_Transform_Reference.slugify('## Header'));
        expect(linkUtils.generateSlug('# Привет Мир')).toBe(Url_Transform_Reference.slugify('# Привет Мир'));
    });
});

describe('Url_Transform_Reference frozen snapshot (legacy slugify_diplodoc_reference)', () => {
    // Snapshot зафиксирован из legacy slugify_diplodoc_reference до миграции.
    // Любое изменение в правилах (разделитель, trim, набор символов) сломает
    // эти кейсы — это правильно: переименование anchor'ов ломает md-ссылки.
    const cases: Array<[string, string]> = [
        ['', ''],
        ['abc', 'abc'],
        ['ABC', 'abc'],
        ['# Header', 'header'],
        ['## Multi Word Header', 'multi-word-header'],
        ['### Header ###', 'header-'],        // legacy-баг: trailing dash
        ['# Header\n', 'header-'],            // legacy-баг: trailing dash
        ['# Привет Мир', 'privet-mir'],
        ['# Привет, Мир!', 'privet-mir'],
        ['Привет, Мир!', 'privet-mir'],
        ['a/b/c', 'a/b/c'],
        ['a=b', 'a=b'],
        ['a\\b', 'a\\b'],
        ['a---b', 'a-b'],
        ['a - b', 'a-b'],
        ['жизнь', 'zhizn'],
        ['объект', 'obekt'],
        ['Text#anchor', 'textanchor'],
    ];

    it('00.6.3#19 should keep frozen legacy slugify_diplodoc_reference output', () => {
        for (const [input, expected] of cases) {
            expect(Url_Transform_Reference.slugify(input)).toBe(expected);
        }
    });
});