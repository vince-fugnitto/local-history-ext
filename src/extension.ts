import * as vscode from 'vscode';
import { LocalHistoryProvider, maxEntriesPerFile } from './local-history';

export function activate(context: vscode.ExtensionContext) {
    const disposable: vscode.Disposable[] = [];

    // Initialize a local history provider and load entries.
    const provider = new LocalHistoryProvider();
    if (vscode.workspace.workspaceFolders) {
        provider.loadEntriesOnActivation();
    }

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        vscode.window.showInformationMessage('The workspace has been updated!');
        if (vscode.workspace.workspaceFolders) {
            provider.loadEntriesOnActivation();
        }
    });

    vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration(maxEntriesPerFile)) {
            provider.updateMaxEntriesPerFile();
        }
    });

    // Simple command to echo if the extension has successfully loaded and is active.
    disposable.push(vscode.commands.registerCommand('local-history.echo', () => {
        vscode.window.showInformationMessage('\'Local History\' is active.');
    }));

    // Command which lists the local history for the active editor.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.viewAllForActiveEditor', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                provider.viewAllForActiveEditor(editor);
            }
        })
    );

    // Listen to editor save events to create local history files.
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        provider.saveActiveEditorContext(document);
    });

    context.subscriptions.push(...disposable);
}

export function deactivate() { }
