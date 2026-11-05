import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ContextMap } from './contexts.types.ts';
import { walkMdFilesGetContexts } from './сontexts.collector.js';

let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'contexts-collector-'));
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

describe('contexts.collector.walkMdFilesGetContexts (+9)', () => {
    it('00.4.2#39 (+9) should collect context from regular .md frontmatter', () => {
        writeMd('page.md', '---\ntitle: Page\ncontext: onboarding\n---\n\nbody');
        const map: ContextMap = walkMdFilesGetContexts(langDir);
        expect(map['onboarding']).toBeDefined();
        expect(map['onboarding'].rank).toBe(1);
    });

    it('00.4.2#40 (+9) should skip own output dir (contexts)', () => {
        writeMd('contexts/index.md', '---\ntitle: I\ncontext: SHOW\n---\n');
        writeMd('page.md', '---\ntitle: Page\ncontext: keep\n---\n');
        const map = walkMdFilesGetContexts(langDir);
        expect(map['keep']).toBeDefined();
        expect(map['show']).toBeUndefined();
    });

    it('00.4.2#41 (+9) should walk into .hidden dirs (skipHidden: false)', () => {
        writeMd('.hidden/page.md', '---\ntitle: H\ncontext: hidden\n---\n');
        const map = walkMdFilesGetContexts(langDir);
        expect(map['hidden']).toBeDefined();
    });

    it('00.4.2#42 (+9) should walk into _underscore dirs (skipUnderscore: false)', () => {
        writeMd('_assets/page.md', '---\ntitle: A\ncontext: under\n---\n');
        const map = walkMdFilesGetContexts(langDir);
        expect(map['under']).toBeDefined();
    });

    it('00.4.2#43 (+9) should walk into abbrs/terms/helptags/figures/roadmap (not in SKIP_DIRS)', () => {
        for (const dir of ['abbrs', 'terms', 'helptags', 'figures', 'roadmap']) {
            writeMd(`${dir}/page.md`, `---\ntitle: P\ncontext: from-${dir}\n---\n`);
        }
        const map = walkMdFilesGetContexts(langDir);
        for (const dir of ['abbrs', 'terms', 'helptags', 'figures', 'roadmap']) {
            expect(map[`from-${dir}`]).toBeDefined();
        }
    });

    it('00.4.2#44 (+9) should aggregate unique pages, no duplicates by href', () => {
        writeMd('a.md', '---\ntitle: A\ncontext: tag\n---\n');
        writeMd('b.md', '---\ntitle: B\ncontext: tag\n---\n');
        const map = walkMdFilesGetContexts(langDir);
        expect(map['tag'].rank).toBe(2);
    });
});