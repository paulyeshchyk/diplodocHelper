import { describe, expect, it } from '@jest/globals';
import { Link_Classify_External } from './Link_Classify_External';

describe('Link_Classify_External.classify', () => {
    it('00.2.1#01 should classify http scheme', () => {
        expect(Link_Classify_External.classify('http://example.com')).toBe('http');
    });
    it('00.2.1#02 should classify https scheme (case-insensitive)', () => {
        expect(Link_Classify_External.classify('https://example.com')).toBe('http');
        expect(Link_Classify_External.classify('HTTPS://example.com')).toBe('http');
    });
    it('00.2.1#03 should classify hash anchor', () => {
        expect(Link_Classify_External.classify('#')).toBe('anchor');
        expect(Link_Classify_External.classify('#section')).toBe('anchor');
    });
    it('00.2.1#04 should classify mailto (case-insensitive)', () => {
        expect(Link_Classify_External.classify('mailto:a@b.c')).toBe('mailto');
        expect(Link_Classify_External.classify('MAILTO:a@b.c')).toBe('mailto');
    });
    it('00.2.1#05 should classify data URI', () => {
        expect(Link_Classify_External.classify('data:image/png;base64,AAA')).toBe('data');
    });
    it('00.2.1#06 should classify absolute root path', () => {
        expect(Link_Classify_External.classify('/foo')).toBe('absolute');
        expect(Link_Classify_External.classify('//cdn.example.com/x')).toBe('absolute');
    });
    it('00.2.1#07 should classify relative paths as internal', () => {
        expect(Link_Classify_External.classify('./foo')).toBe('internal');
        expect(Link_Classify_External.classify('../foo')).toBe('internal');
    });
    it('00.2.1#08 should classify plain file name as internal', () => {
        expect(Link_Classify_External.classify('foo.md')).toBe('internal');
        expect(Link_Classify_External.classify('')).toBe('internal');
    });
});

describe('Link_Classify_External.isExternalLink (regression of mdLinks)', () => {
    it('00.2.1#09 should return false for data: (preserves mdLinks asymmetry)', () => {
        expect(Link_Classify_External.isExternalLink('data:image/png;base64,AAA')).toBe(false);
    });
    it('00.2.1#10 should return true for absolute root path (preserves mdLinks behavior)', () => {
        expect(Link_Classify_External.isExternalLink('/foo')).toBe(true);
        expect(Link_Classify_External.isExternalLink('//cdn.example.com/x')).toBe(true);
    });
    it('00.2.1#11 should return true for http / anchor / mailto', () => {
        expect(Link_Classify_External.isExternalLink('https://example.com')).toBe(true);
        expect(Link_Classify_External.isExternalLink('#x')).toBe(true);
        expect(Link_Classify_External.isExternalLink('mailto:a@b.c')).toBe(true);
    });
    it('00.2.1#12 should return false for relative paths', () => {
        expect(Link_Classify_External.isExternalLink('./foo')).toBe(false);
        expect(Link_Classify_External.isExternalLink('foo.md')).toBe(false);
    });
});

describe('Link_Classify_External.isRemoteOrDataUrl (regression of md.links.extract)', () => {
    it('00.2.1#13 should return false for absolute root path (preserves extract asymmetry)', () => {
        expect(Link_Classify_External.isRemoteOrDataUrl('/foo')).toBe(false);
    });
    it('00.2.1#14 should return true for data:', () => {
        expect(Link_Classify_External.isRemoteOrDataUrl('data:image/png;base64,AAA')).toBe(true);
    });
    it('00.2.1#15 should return true for http / anchor / mailto', () => {
        expect(Link_Classify_External.isRemoteOrDataUrl('https://example.com')).toBe(true);
        expect(Link_Classify_External.isRemoteOrDataUrl('#x')).toBe(true);
        expect(Link_Classify_External.isRemoteOrDataUrl('mailto:a@b.c')).toBe(true);
    });
    it('00.2.1#16 should return false for relative paths', () => {
        expect(Link_Classify_External.isRemoteOrDataUrl('./foo')).toBe(false);
        expect(Link_Classify_External.isRemoteOrDataUrl('foo.md')).toBe(false);
    });
});

/**
 * Cross-module sanity: обёртки-потребители после рефакторинга
 * должны вести себя так же, как до него.
 *
 * Совместимость с командой секции delete/move/rename и удаления
 * файла: mdLinks экспортирует isExternalLink, который используется
 * в updateLinksInContent / findReferencesToMd*.
 */
describe('Consumer wrappers', () => {
    
    const mdLinks = require('../../../plugins/shared/parser/md/mdLinks');
    
    const mdLinksExtract = require('../../utils/md.links.extract');

    it('00.2.1#17 (+24,25,26,39,40) should preserve mdLinks.isExternalLink semantics', () => {
        expect(mdLinks.isExternalLink({ rawPath: 'data:image/png;base64,AAA' })).toBe(false);
        expect(mdLinks.isExternalLink({ rawPath: '/foo' })).toBe(true);
        expect(mdLinks.isExternalLink({ rawPath: 'https://x' })).toBe(true);
        expect(mdLinks.isExternalLink({ rawPath: './foo.md' })).toBe(false);
    });

    it('00.2.1#18 (+31) should preserve md.links.extract isRemoteOrDataUrl semantics', () => {
        expect(mdLinksExtract.isRemoteOrDataUrl('data:image/png;base64,AAA')).toBe(true);
        expect(mdLinksExtract.isRemoteOrDataUrl('/foo')).toBe(false);
        expect(mdLinksExtract.isRemoteOrDataUrl('https://x')).toBe(true);
        expect(mdLinksExtract.isRemoteOrDataUrl('./foo.md')).toBe(false);
    });
});