import * as vscode from 'vscode';
import * as path from 'path';
import { LocalHistoryManager } from './local-history/local-history-manager';
import { LocalHistoryTreeProvider } from './local-history/local-history-tree-provider';

export function activate(context: vscode.ExtensionContext) {

    // Collection of resources which should be released.
    const disposable: vscode.Disposable[] = [];

    // Instantiate a new local history manager.
    const manager: LocalHistoryManager = new LocalHistoryManager();

    disposable.push(
        // Displays the local history of the active file.
        vscode.commands.registerCommand('local-history.viewHistory', (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }
            manager.viewHistory(uri);

        })
    );

    // Command which reverts the active editor to its previous revision.
    disposable.push(
        vscode.commands.registerTextEditorCommand('local-history.revertToPrevRevision', () => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length === 2) {
                vscode.window.showWarningMessage(`Are you sure you want to revert '${path.basename(editors[1].document.fileName)}' to its previous state?`, { modal: true }, 'Revert').then((selection) => {
                    if (selection === 'Revert') {
                        manager.revertToPrevRevision(editors[0], editors[1]);
                    }
                });
            }
        })
    );

    // Command which removes the active revision of a file.
    disposable.push(
        vscode.commands.registerCommand('local-history.removeRevision', (revision) => {
            const editors = vscode.window.visibleTextEditors;
            if (editors && editors.length === 2) {
                // Diff is opened, click 'Remove revision' either from diff toolbar or tree-view
                vscode.window.showWarningMessage(`Are you sure you want to delete '${path.basename(editors[0].document.fileName)}' permanently?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        manager.removeRevision(editors[0].document.uri, true);
                    }
                });
            } else if (revision) {
                // No diff opened, click 'Remove revision' from tree-view
                vscode.window.showWarningMessage(`Are you sure you want to delete '${path.basename(revision.uri)}' permanently?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        manager.removeRevision(vscode.Uri.file(revision.uri));
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
            manager.clearHistory(uri);
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
                manager.removeOldFiles(parseInt(days));
            }
        })
    );

    context.subscriptions.push(...disposable);

    // Tree View
    const treeProvider = new LocalHistoryTreeProvider(manager);
    vscode.window.registerTreeDataProvider('localHistoryTree', treeProvider);
    vscode.commands.registerCommand('local-history.refreshEntry', () => treeProvider.refresh());
    vscode.commands.registerCommand('extension.openRevisionInDiff', uri =>
        manager.displayDiff(vscode.Uri.file(uri), vscode.window.activeTextEditor!.document.uri));
}

export function deactivate() { }
