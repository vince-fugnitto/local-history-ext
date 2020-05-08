import * as vscode from 'vscode';
import * as path from 'path';
import { LocalHistoryManager } from './local-history/local-history-manager';

export function activate(context: vscode.ExtensionContext) {

    // Collection of resources which should be released.
    const disposable: vscode.Disposable[] = [];

    // Instantiate a new local history manager.
    const provider: LocalHistoryManager = new LocalHistoryManager();

    disposable.push(
        // Displays the local history of the active file.
        vscode.commands.registerCommand('local-history.viewHistory', (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }
            provider.viewHistory(uri);

        })
    );

    // Command which reverts the active editor to its previous revision.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.revertToPrevRevision', () => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length === 2) {
                vscode.window.showWarningMessage(`Are you sure you want to revert '${path.basename(editors[1].document.fileName)}' to its previous state?`, { modal: true }, 'Revert').then((selection) => {
                    if (selection === 'Revert') {
                        provider.revertToPrevRevision(editors[0], editors[1]);
                    }
                });
            }
        })
    );

    // Command which removes the active revision of a file.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.removeRevision', () => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length === 2) {
                vscode.window.showWarningMessage(`Are you sure you want to delete '${path.basename(editors[0].document.fileName)}' permanently?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        provider.removeRevision(editors[0]);
                    }
                });
            }
        })
    );

    // Command which removes all revisions of the active file.
    disposable.push(
        vscode.commands.registerCommand('local-history.clearHistory', (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }
            provider.clearHistory(uri);
        })
    );

    // Command which removes old revisions.
    disposable.push(
        vscode.commands.registerCommand('local-history.clearOldHistory', async () => {
            const days = await vscode.window.showInputBox({
                value: '30',
                placeHolder: 'Please enter the amount of days',
                validateInput: input => {
                    const day = parseInt(input);
                    return day ? undefined : 'Please enter a valid positive number';
                }
            });
            if (days) {
                provider.removeOldFiles(parseInt(days));
            }
        })
    );

    context.subscriptions.push(...disposable);
}

export function deactivate() { }
