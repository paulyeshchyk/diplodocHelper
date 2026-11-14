// __mocks__/vscode.js

/* eslint-disable */
const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
        createWebviewPanel: jest.fn(),
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn(),
    },
    workspace: {
        workspaceFolders: [],
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
        })),
        onDidChangeConfiguration: jest.fn(),
        onDidSaveTextDocument: jest.fn(),
    },
    Uri: {
        parse: jest.fn(),
        file: jest.fn(path => ({ fsPath: path, path })),
    },
    ExtensionMode: {
        Production: 1,
        Development: 2,
        Test: 3,
    },
    createQuickPick: jest.fn(() => {
        const qp = {
            items: [], value: '', placeholder: '',
            matchOnDescription: false, matchOnDetail: false, selectedItems: [],
            onDidChangeValue: jest.fn(),
            onDidAccept: jest.fn(),
            onDidHide: jest.fn(),
            show: jest.fn(), dispose: jest.fn(),
        };
        return qp;
    }),
};

module.exports = vscode;
