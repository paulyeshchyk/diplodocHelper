import type { QuickPickItem } from 'vscode';

export interface DictionaryEntry {
    readonly key: string;         // abbr / term
    readonly description: string; // full / definition
    readonly category?: string;
}

export type DictionaryPickerAction = 'use' | 'create' | 'removeMarkup';

export interface DictionaryPickerItem extends QuickPickItem {
    readonly action: DictionaryPickerAction;
    readonly def?: DictionaryEntry;
    readonly query?: string;
}

export interface BuildDictionaryItemsOptions {
    readonly entries: ReadonlyArray<DictionaryEntry>;
    readonly query: string;
    readonly alreadyWrapped: boolean;
    readonly removeMarkupLabel: string;
    readonly createLabel: (q: string) => string;
}

export class QuickPick_Build_DictionaryItems {
    static build(opts: BuildDictionaryItemsOptions): DictionaryPickerItem[] {
        const q = opts.query.trim();
        const qLower = q.toLowerCase();
        const result: DictionaryPickerItem[] = [];

        if (opts.alreadyWrapped) {
            result.push({
                label: `$(close) ${opts.removeMarkupLabel}`,
                action: 'removeMarkup',
                alwaysShow: true,
            });
        }

        const useItems: DictionaryPickerItem[] = opts.entries.map(e => ({
            label: e.key,
            description: e.description,
            detail: e.category,
            action: 'use',
            def: e,
        }));

        if (!q) {
            result.push(...useItems);
            return result;
        }

        const matched = useItems.filter(it =>
            it.label.toLowerCase().includes(qLower) ||
            (it.description && it.description.toLowerCase().includes(qLower)) ||
            (it.detail && it.detail.toLowerCase().includes(qLower)),
        );

        const exactIdx = matched.findIndex(it => it.label.toLowerCase() === qLower);
        if (exactIdx > 0) {
            const [exact] = matched.splice(exactIdx, 1);
            matched.unshift(exact);
        }
        const hasExact = matched.length > 0 && matched[0].label.toLowerCase() === qLower;

        result.push(...matched);

        if (!hasExact) {
            result.push({
                label: `$(add) ${opts.createLabel(q)}`,
                action: 'create',
                query: q,
                alwaysShow: true,
            });
        }
        return result;
    }
}