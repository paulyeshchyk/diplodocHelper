import { describe, expect, it } from '@jest/globals';
import { Link_Format_Markdown } from './Link_Format_Markdown.ts';

describe('Link_Format_Markdown.format', () => {
    it('00.11.2#01 строит MD-ссылку на документ', () => {
        expect(Link_Format_Markdown.format('Title', './foo.md', false, false))
            .toBe('[Title](./foo.md)');
    });

    it('00.11.2#02 строит MD-ссылку на картинку', () => {
        expect(Link_Format_Markdown.format('alt', './img.png', true, false))
            .toBe('![alt](./img.png)');
    });

    it('00.11.2#03 строит HTML-ссылку на документ', () => {
        expect(Link_Format_Markdown.format('Title', '/ru/foo.html', false, true))
            .toBe('<a href="/ru/foo.html">Title</a>');
    });

    it('00.11.2#04 строит HTML-ссылку на картинку', () => {
        expect(Link_Format_Markdown.format('alt', '/ru/img.png', true, true))
            .toBe('<img src="/ru/img.png" alt="alt">');
    });
});