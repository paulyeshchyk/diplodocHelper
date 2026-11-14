import * as vscode from 'vscode';

export interface PickResult<T> {
    readonly picked: T | null;
    readonly query: string;
}

export interface PickOptions<T extends vscode.QuickPickItem> {
    readonly placeholder: string;
    readonly initialValue?: string;
    readonly computeItems: (query: string) => ReadonlyArray<T>;
    readonly matchOnDescription?: boolean;
    readonly matchOnDetail?: boolean;
}

export class QuickPick_Pick_From_List {
    static pick<T extends vscode.QuickPickItem>(opts: PickOptions<T>): Promise<PickResult<T>> {
        return new Promise(resolve => {
            const qp = vscode.window.createQuickPick<T>();
            qp.placeholder = opts.placeholder;
            qp.matchOnDescription = opts.matchOnDescription ?? true;
            qp.matchOnDetail = opts.matchOnDetail ?? true;
            qp.items = opts.computeItems(opts.initialValue ?? '');
            if (opts.initialValue) qp.value = opts.initialValue;

            qp.onDidChangeValue(v => {
                qp.items = opts.computeItems(v);
            });

            let settled = false;
            qp.onDidAccept(() => {
                if (settled) return;
                settled = true;
                const picked = (qp.selectedItems[0] as T | undefined) ?? null;
                const query = qp.value.trim();
                qp.dispose();
                resolve({ picked, query });
            });
            qp.onDidHide(() => {
                if (settled) return;
                settled = true;
                qp.dispose();
                resolve({ picked: null, query: '' });
            });
            qp.show();
        });
    }
}