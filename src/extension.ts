import * as vscode from 'vscode';
import { LocalHistoryManager } from './local-history/local-history-manager';

export function activate(context: vscode.ExtensionContext) {

    // Collection of resources which should be released.
    const disposable: vscode.Disposable[] = [];

    // Instantiate a new local history manager.
    const provider: LocalHistoryManager = new LocalHistoryManager();

    disposable.push(
        // Displays the local history for the currently active editor.
        vscode.commands.registerTextEditorCommand('local-history.viewAllForActiveEditor', () => {
            provider.viewAllForActiveEditor(vscode.window.activeTextEditor!);
        })
    );

    context.subscriptions.push(...disposable);
}

export function deactivate() { }
