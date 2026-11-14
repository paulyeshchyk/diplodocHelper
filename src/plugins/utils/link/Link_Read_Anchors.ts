// src/plugins/utils/link/Link_Read_Anchors.ts

export interface AnchorItem {
    readonly label: string;
    readonly anchor: string;
}

const INLINE_ID_TAGS = ['strong', 'abbr', 'span', 'b', 'i', 'em', 'code'] as const;

export class Link_Read_Anchors {
    /**
     * Извлекает якоря из markdown-контента:
     *   1. Заголовки `## Title` и `## Title {#anchor}`.
     *   2. Inline-элементы с `id="..."`: `<strong id="X">Text</strong>` → label = Text.
     *   3. Bare `id="..."` без обёртки → label = `id: X` (fallback).
     *   4. Legacy `<a name="X">` → label = `name: X`.
     *
     * Дедупликация по anchor (первое вхождение выигрывает).
     */
    static extract(content: string, generateSlug: (s: string) => string): AnchorItem[] {
        const anchors: AnchorItem[] = [];
        const seen = new Set<string>();

        const push = (anchor: string, label: string): void => {
            if (!anchor || seen.has(anchor)) return;
            seen.add(anchor);
            anchors.push({ label, anchor });
        };

        // ─── 1. Заголовки ───
        const headingRe = /^\s*(#{1,6})\s+(.+?)(?:\s*\{#([^}]+)\})?\s*$/gm;
        let m: RegExpExecArray | null;
        while ((m = headingRe.exec(content)) !== null) {
            const level = m[1].length;
            const title = m[2].trim();
            const explicit = m[3]?.trim();
            const anchor = explicit || generateSlug(title);
            push(anchor, `${'#'.repeat(level)} ${title}`);
        }

        // ─── 2. Inline-элементы с id и видимым текстом ───
        const tagAlt = INLINE_ID_TAGS.join('|');
        const inlineRe = new RegExp(
            `<(${tagAlt})\\b[^>]*?\\bid\\s*=\\s*(["']?)([^"'\\s>]+)\\2[^>]*>([\\s\\S]*?)<\\/\\1>`,
            'gi',
        );
        while ((m = inlineRe.exec(content)) !== null) {
            const idValue = m[3];
            const innerHtml = m[4];
            const visible = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (idValue && visible) {
                push(idValue, visible);
            }
        }

        // ─── 3. Bare id="..." (для якорей без обёртки) ───
        const bareIdRe = /\bid\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        while ((m = bareIdRe.exec(content)) !== null) {
            push(m[2], `id: ${m[2]}`);
        }

        // ─── 4. Legacy <a name="X"> ───
        const nameRe = /<a\s+name\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        while ((m = nameRe.exec(content)) !== null) {
            push(m[2], `name: ${m[2]}`);
        }

        return anchors;
    }
}