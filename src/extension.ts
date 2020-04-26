import * as vscode from 'vscode';
import * as path from 'path';
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

    // Command which reverts the active editor to its previous revision.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.revertActiveEditorToPrevRevision', () => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length === 2) {
                vscode.window.showWarningMessage(`Are you sure you want to revert '${path.basename(editors[1].document.fileName)}' to its previous state?`, { modal: true }, 'Revert').then((selection) => {
                    if (selection === 'Revert') {
                        provider.revertActiveEditorToPrevRevision(editors[0], editors[1]);
                    }
                });
            }
            else if (editors && editors.length === 1) {
                provider.viewAllForActiveEditor(vscode.window.activeTextEditor!);
            }
        })
    );

    // Command which remove the active revision of a file.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.removeRevision', () => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length > 0) {
                provider.removeRevision(editors[0]);
            }
        })
    );

    context.subscriptions.push(...disposable);
}

export function deactivate() { }
