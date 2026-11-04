import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { walkMdFilesGetHelptags } from './helptags.collector';
import type { HelptagMap } from './helptags.types';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'helptags-collector-'));
    langDir = path.join(root, 'ru');
    fs.mkdirSync(langDir, { recursive: true });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

function writeMd(relPath: string, body: string): void {
    const full = path.join(langDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf8');
}

describe('helptags.collector.walkMdFilesGetHelptags (+10)', () => {
    it('00.4.2#32 (+10) should collect helptag from regular .md frontmatter', () => {
        writeMd('page.md', '---\ntitle: Page\nhelptag: onboarding\n---\n\nbody');
        const map: HelptagMap = walkMdFilesGetHelptags(langDir);
        expect(map['onboarding']).toBeDefined();
        expect(map['onboarding'].rank).toBe(1);
        expect(map['onboarding'].pages[0].href).toBe('page.md');
    });

    it('00.4.2#33 (+10) should skip own output dir (helptags)', () => {
        writeMd('helptags/index.md', '---\ntitle: Index\nhelptag: SHOW\n---\n');
        writeMd('page.md', '---\ntitle: Page\nhelptag: keep\n---\n');
        const map = walkMdFilesGetHelptags(langDir);
        expect(map['keep']).toBeDefined();
        expect(map['show']).toBeUndefined();
    });

    it('00.4.2#34 (+10) should skip sibling contexts dir', () => {
        writeMd('contexts/index.md', '---\ntitle: Index\nhelptag: SHOW\n---\n');
        const map = walkMdFilesGetHelptags(langDir);
        expect(map['show']).toBeUndefined();
    });

    it('00.4.2#35 (+10) should walk into .hidden dirs (skipHidden: false)', () => {
        writeMd('.hidden/page.md', '---\ntitle: H\nhelptag: hidden-tag\n---\n');
        const map = walkMdFilesGetHelptags(langDir);
        expect(map['hidden-tag']).toBeDefined();
    });

    it('00.4.2#36 (+10) should walk into _underscore dirs (skipUnderscore: false)', () => {
        writeMd('_assets/page.md', '---\ntitle: A\nhelptag: under-tag\n---\n');
        const map = walkMdFilesGetHelptags(langDir);
        expect(map['under-tag']).toBeDefined();
    });

    it('00.4.2#37 (+10) should walk into abbrs/terms/figures/roadmap (not in SKIP_DIRS)', () => {
        for (const dir of ['abbrs', 'terms', 'figures', 'roadmap']) {
            writeMd(`${dir}/page.md`, `---\ntitle: P\nhelptag: from-${dir}\n---\n`);
        }
        const map = walkMdFilesGetHelptags(langDir);
        for (const dir of ['abbrs', 'terms', 'figures', 'roadmap']) {
            expect(map[`from-${dir}`]).toBeDefined();
        }
    });

    it('00.4.2#38 (+10) should aggregate unique pages, no duplicates by href', () => {
        writeMd('a.md', '---\ntitle: A\nhelptag: tag\n---\n');
        writeMd('b.md', '---\ntitle: B\nhelptag: tag\n---\n');
        const map = walkMdFilesGetHelptags(langDir);
        expect(map['tag'].rank).toBe(2);
        const hrefs = map['tag'].pages.map(p => p.href).sort();
        expect(hrefs).toEqual(['a.md', 'b.md']);
    });
});