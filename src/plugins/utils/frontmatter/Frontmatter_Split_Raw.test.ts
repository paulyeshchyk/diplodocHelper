import { describe, expect, it } from '@jest/globals';
import { Frontmatter_Split_Raw } from './Frontmatter_Split_Raw.ts';

describe('Frontmatter_Split_Raw.split', () => {
    it('57.7.2#01 should return null when no frontmatter delimiters', () => {
        expect(Frontmatter_Split_Raw.split('just body')).toBeNull();
        expect(Frontmatter_Split_Raw.split('')).toBeNull();
    });

    it('57.7.2#02 should return null for unclosed frontmatter', () => {
        expect(Frontmatter_Split_Raw.split('---\ntitle: A')).toBeNull();
        expect(Frontmatter_Split_Raw.split('---\ntitle: A\nno closing')).toBeNull();
    });

    it('57.7.2#03 should return null when frontmatter is not at start', () => {
        expect(Frontmatter_Split_Raw.split('prefix\n---\ntitle: A\n---')).toBeNull();
    });

    it('57.7.2#04 should split frontmatter and body (LF)', () => {
        const r = Frontmatter_Split_Raw.split('---\ntitle: A\n---\n\nbody');
        expect(r).toEqual({ frontmatter: 'title: A', body: '\nbody' });
    });

    it('57.7.2#05 should split frontmatter and body (CRLF)', () => {
        const r = Frontmatter_Split_Raw.split('---\r\ntitle: A\r\n---\r\nbody');
        expect(r).toEqual({ frontmatter: 'title: A', body: 'body' });
    });

    it('57.7.2#06 should return empty body when file ends right after closing ---', () => {
        const r = Frontmatter_Split_Raw.split('---\ntitle: A\n---');
        expect(r).toEqual({ frontmatter: 'title: A', body: '' });
    });

    it('57.7.2#07 should preserve multi-line frontmatter as-is', () => {
        const r = Frontmatter_Split_Raw.split('---\ntitle: A\nactor: ci\n---\nbody');
        expect(r).toEqual({ frontmatter: 'title: A\nactor: ci', body: 'body' });
    });

    it('57.7.2#08 should not parse YAML — invalid frontmatter returns as-is', () => {
        // Невалидный YAML проходит через split без ошибки
        const r = Frontmatter_Split_Raw.split('---\n: : invalid\n---\nbody');
        expect(r).toEqual({ frontmatter: ': : invalid', body: 'body' });
    });

    it('57.7.2#09 should return null for empty frontmatter block (legacy contract)', () => {
        // Legacy-поведение (regex из collect-catalog/build-page-legend до миграции):
        // пустой frontmatter `---\n---` не матчится, файл считается
        // «без frontmatter» и пропускается.
        //
        // Расхождение с `frontmatter.utils.parse` (gray-matter): тот
        // возвращает `{ data: {}, content: 'body' }` для того же входа.
        //
        // TODO(chore): исправить legacy отдельной волной. Правка регекса
        // `([\s\S]*?)\r?\n---` → `([\s\S]*?)(?:\r?\n)?---` включит
        // пустой frontmatter в каталог. Это **breaking**: файлы, ранее
        // пропускавшиеся, появятся в `catalog.<lang>.json`, а через
        // них — в `modules.md`, `feature-map.md`. Нужен явный CHANGELOG.
        expect(Frontmatter_Split_Raw.split('---\n---\nbody')).toBeNull();
        expect(Frontmatter_Split_Raw.split('---\r\n---\r\nbody')).toBeNull();
    });
});