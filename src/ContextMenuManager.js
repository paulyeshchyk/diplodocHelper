// src/ContextMenuManager.js
const vscode = require('vscode');

const DEFAULT_DEBOUNCE = 250;
const DEFAULT_POLLING_INTERVAL = 2000;

/**
 * Базовый менеджер контекста
 */
class ContextMenuManager {
    /**
     * @param {vscode.ExtensionContext | null} [extensionContext]
     */
    constructor(extensionContext = null) {
        /** @type {vscode.Disposable[]} */
        this.disposables = [];

        /** @type {Map<string, () => Promise<any>>} */
        this.contextUpdaters = new Map();

        if (extensionContext) {
            this.subscribeToEvents(extensionContext);
        }
    }

    /**
     * @param {string} key
     * @param {() => Promise<any>} valueGetter
     */
    registerContextKey(key, valueGetter) {
        if (typeof valueGetter !== 'function') {
            throw new Error(`valueGetter для ключа "${key}" должен быть функцией`);
        }
        this.contextUpdaters.set(key, valueGetter);
    }

    async refreshContext() {
        const promises = Array.from(this.contextUpdaters.entries()).map(async ([key, getter]) => {
            try {
                const value = await getter();
                await vscode.commands.executeCommand('setContext', key, value);
            } catch (error) {
                console.error(`[ContextMenuManager] Ошибка обновления "${key}":`, error);
            }
        });

        await Promise.all(promises);
    }

    /**
     * @param {vscode.ExtensionContext} extensionContext
     */
    subscribeToEvents(extensionContext) {
        // Смена активного редактора
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => this.refreshContext()));

        /** @type {NodeJS.Timeout} */
        let timeout;
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    if (timeout) clearTimeout(timeout);
                    timeout = setTimeout(() => this.refreshContext(), DEFAULT_DEBOUNCE);
                }
            })
        );

        // Возврат фокуса в окно
        this.disposables.push(
            vscode.window.onDidChangeWindowState(async state => {
                if (state.focused) {
                    await this.refreshContext();
                }
            })
        );

        this.disposables.forEach(d => extensionContext.subscriptions.push(d));
    }

    async forceRefresh() {
        await this.refreshContext();
    }

    forceStop() {
        //
    }

    dispose() {
        this.forceStop();

        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

/**
 * Менеджер с поддержкой polling'а
 */
class PollingContextMenuManager extends ContextMenuManager {
    /**
     * @param {number} [pollingInterval=DEFAULT_POLLING_INTERVAL]
     * @param {vscode.ExtensionContext | null} [extensionContext]
     */
    constructor(pollingInterval = DEFAULT_POLLING_INTERVAL, extensionContext = null) {
        super(extensionContext);
        this.pollingIntervalMs = pollingInterval;
        this.pollingInterval = null;

        if (extensionContext) {
            this.startPolling();
        }
    }

    forceStop() {
        super.forceStop();
        this.stopPolling();
    }

    startPolling() {
        if (this.pollingInterval) return;
        this.pollingInterval = setInterval(() => {
            this.refreshContext();
        }, this.pollingIntervalMs);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    dispose() {
        super.dispose();
    }
}

/**
 * Основной фасад
 */
class ContextManager {
    /**
     * @param {boolean} [usePolling=true]
     * @param {number} [pollingInterval=DEFAULT_POLLING_INTERVAL]
     * @param {vscode.ExtensionContext | null} [extensionContext]
     */
    constructor(usePolling = true, pollingInterval = DEFAULT_POLLING_INTERVAL, extensionContext = null) {
        if (usePolling) {
            this.manager = new PollingContextMenuManager(pollingInterval, extensionContext);
        } else {
            this.manager = new ContextMenuManager(extensionContext);
        }
    }

    /**
     * @param {string} key
     * @param {() => Promise<any>} valueGetter
     */
    registerContextKey(key, valueGetter) {
        this.manager.registerContextKey(key, valueGetter);
    }

    async forceRefresh() {
        await this.manager.forceRefresh();
    }

    forceStop() {
        this.manager.forceStop();
    }

    dispose() {
        this.manager.forceStop();
        this.manager.dispose();
    }
}

module.exports = {
    ContextMenuManager,
    PollingContextMenuManager,
    ContextManager,
};
