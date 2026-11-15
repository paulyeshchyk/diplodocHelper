import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { collectMdFilesByToc } from '../utils/toc.order.js';
import { extractFootnoteRefs, extractFootnoteDefs } from '../reindexer/reindexer.footnotes.js';

export interface FootnoteListItem {
    number: number;
    text: string;
    article: string;
    url: string;
    refUrl: string;
}

export function collectFootnotes(docsDir: string, langPrefix: string | null, urlPrefix: string): FootnoteListItem[] {
    const files = collectMdFilesByToc(docsDir);
    const result: FootnoteListItem[] = [];
    let counter = 1;

    for (const file of files) {
        let content: string;
        try {
            content = fs.readFileSync(file, 'utf8');
        } catch (err) {
            const txt = err instanceof Error ? err.message : String(err);
            console.error(`❌ [footnoteList] Не удалось прочитать ${file}: ${txt}`);
            continue;
        }

        const { data } = matter(content);
        const title =
            (data.title && String(data.title).trim()) ||
            (data.pureTitle && String(data.pureTitle).trim()) ||
            path.basename(path.dirname(file));

        const refs = extractFootnoteRefs(content);
        const defs = extractFootnoteDefs(content);

        const idToNumber = new Map<string, number>();
        for (const r of refs) {
            if (!idToNumber.has(r.id)) {
                idToNumber.set(r.id, counter++);
            }
        }

        const defsById = new Map<string, string>();
        for (const d of defs) {
            if (!defsById.has(d.id)) defsById.set(d.id, d.content);
        }

        const rel = path.relative(docsDir, file).replace(/\\/g, '/').replace(/\.md$/, '.html');
        const prefixWithLang = langPrefix ? `${langPrefix}/` : '';
        const url = `${urlPrefix}${prefixWithLang}${rel}`;

        for (const [id, num] of idToNumber) {
            result.push({
                number: num,
                text: stripLinks(defsById.get(id) || ''),
                article: title,
                url,
                refUrl: `${url}#fnref${num}`,
            });
        }
    }

    return result;
}

export function stripLinks(str: unknown): string {
    return (
        String(str || '')
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/<\/?a\b[^>]*>/gi, '')
    );
}