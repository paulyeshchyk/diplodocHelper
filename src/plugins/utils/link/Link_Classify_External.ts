/**
 * Классификатор markdown/HTML-ссылок по внешности.
 *
 * Централизует два исторических предиката (см. consumers):
 *   - `isExternalLink`    — «не транслируется как относительный путь»
 *                           (http(s) | # | mailto: | absolute `/...`);
 *   - `isRemoteOrDataUrl` — «не читается как файл на диске»
 *                           (http(s) | # | mailto: | data:).
 *
 * ⚠️ Намеренная асимметрия:
 *   - `data:` считается external-путём (isExternalLink → false). Это
 *     унаследовано от `updateLinksInContent`, который исторически
 *     пытается резолвить `data:`-строку через `path.resolve`;
 *     смена семантики — отдельная фича.
 *   - абсолютный путь `/foo` НЕ считается remote/data
 *     (isRemoteOrDataUrl → false). Это унаследовано от
 *     `extractMarkdownImages`, который исторически пропускает только
 *     `http(s)`, `#`, `mailto:`, `data:`.
 */
export type LinkKind = 'http' | 'anchor' | 'mailto' | 'data' | 'absolute' | 'internal';

export class Link_Classify_External {
    private static readonly EXTERNAL_KINDS: ReadonlySet<LinkKind> = new Set([
        'http',
        'anchor',
        'mailto',
        'absolute',
    ]);

    private static readonly REMOTE_OR_DATA_KINDS: ReadonlySet<LinkKind> = new Set([
        'http',
        'anchor',
        'mailto',
        'data',
    ]);

    static classify(rawPath: string): LinkKind {
        if (/^https?:\/\//i.test(rawPath)) return 'http';
        if (rawPath.startsWith('#')) return 'anchor';
        if (/^mailto:/i.test(rawPath)) return 'mailto';
        if (/^data:/i.test(rawPath)) return 'data';
        if (rawPath.startsWith('/')) return 'absolute';
        return 'internal';
    }

    /**
     * Аналог `mdLinks.isExternalLink` из
     * `plugins/shared/parser/md/mdLinks.js`.
     * Заменяет регулярку `/^(https?:\/\/|#|mailto:|\/)/i`.
     */
    static isExternalLink(rawPath: string): boolean {
        return Link_Classify_External.EXTERNAL_KINDS.has(Link_Classify_External.classify(rawPath));
    }

    /**
     * Аналог `isRemoteOrDataUrl` из
     * `plugins/utils/md.links.extract.js` и `mdLinks.js`.
     * Заменяет регулярку `/^(https?:\/\/|#|mailto:|data:)/i`.
     */
    static isRemoteOrDataUrl(rawPath: string): boolean {
        return Link_Classify_External.REMOTE_OR_DATA_KINDS.has(Link_Classify_External.classify(rawPath));
    }
}