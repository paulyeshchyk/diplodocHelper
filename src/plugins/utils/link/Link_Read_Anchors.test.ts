import { describe, expect, it } from '@jest/globals';
import { Link_Read_Anchors } from './Link_Read_Anchors.ts';
import { Url_Transform_Reference } from '../url/Url_Transform_Reference.ts';

const slug = Url_Transform_Reference.slugify;

describe('Link_Read_Anchors.extract', () => {
    it('00.11.3#01 генерируемый термин: <strong id> → label = видимый текст', () => {
        const md = '---\ntitle: T\n---\n\n<strong id="term-valyuta">Валюта</strong> — денежная единица.';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'term-valyuta')?.label).toBe('Валюта');
    });

    it('00.11.3#02 сгенерированное сокращение: <strong id> → label = видимый текст', () => {
        const md = '<strong id="abbr-api">API</strong> — Application Programming Interface';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'abbr-api')?.label).toBe('API');
    });

    it('00.11.3#03 bare id без обёртки → fallback "id: X"', () => {
        const md = '<div id="container">...</div>';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'container')?.label).toBe('id: container');
    });

    it('00.11.3#04 bare id не перебивает уже найденный inline (дедуп)', () => {
        const md = '<strong id="term-x">X</strong> <div id="term-x">dup</div>';
        const r = Link_Read_Anchors.extract(md, slug);
        const items = r.filter(a => a.anchor === 'term-x');
        expect(items).toHaveLength(1);
        expect(items[0].label).toBe('X');
    });

    it('00.11.3#05 заголовки извлекаются с уровнями', () => {
        const md = '# Список терминов\n\n## А\n\n## Б {#letter-b}';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'spisok-terminov')?.label).toBe('# Список терминов');
        expect(r.find(a => a.anchor === 'letter-b')?.label).toBe('## Б');
    });

    it('00.11.3#06 inline с тегами внутри → strip в label', () => {
        const md = '<strong id="x"><em>термин</em></strong>';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'x')?.label).toBe('термин');
    });

    it('00.11.3#07 legacy <a name> как fallback', () => {
        const md = '<a name="old-anchor"></a>';
        const r = Link_Read_Anchors.extract(md, slug);
        expect(r.find(a => a.anchor === 'old-anchor')?.label).toBe('name: old-anchor');
    });

    it('00.11.3#08 пустой контент → []', () => {
        expect(Link_Read_Anchors.extract('', slug)).toEqual([]);
    });
});