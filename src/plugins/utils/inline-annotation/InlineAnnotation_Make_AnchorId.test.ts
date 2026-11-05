import { describe, expect, it } from '@jest/globals';
import { InlineAnnotation_Make_AnchorId } from './InlineAnnotation_Make_AnchorId.ts';

describe('InlineAnnotation_Make_AnchorId.makeAnchorId', () => {
    it('00.5.3#13 should build abbr anchor from ASCII name', () => {
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('abbr', 'GOST')).toBe('abbr-gost');
    });

    it('00.5.3#14 should transliterate cyrillic via slugify_latin_alphanumeric', () => {
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('term', 'Привет')).toBe('term-privet');
    });

    it('00.5.3#15 should build term anchor with same slug rules', () => {
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('term', 'API v2')).toBe('term-api_v2');
    });

    it('00.5.3#16 should preserve legacy behaviour for empty name ("<prefix>-")', () => {
        expect(InlineAnnotation_Make_AnchorId.makeAnchorId('abbr', '')).toBe('abbr-');
    });
});

describe('InlineAnnotation_Make_AnchorId.makeOccurrenceId', () => {
    it('00.5.3#17 should append numeric suffix', () => {
        expect(InlineAnnotation_Make_AnchorId.makeOccurrenceId('abbr', 'GOST', 1)).toBe('abbr-gost-1');
        expect(InlineAnnotation_Make_AnchorId.makeOccurrenceId('abbr', 'GOST', 42)).toBe('abbr-gost-42');
    });

    it('00.5.3#18 should accept string suffix (legacy interpolation contract)', () => {
        expect(InlineAnnotation_Make_AnchorId.makeOccurrenceId('term', 'API', '7')).toBe('term-api-7');
    });
});

