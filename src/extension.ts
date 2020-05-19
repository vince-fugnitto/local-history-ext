import * as vscode from 'vscode';
import * as path from 'path';
import { LocalHistoryManager } from './local-history/local-history-manager';
import { LocalHistoryTreeProvider } from './local-history/local-history-tree-provider';
import { Commands } from './local-history/local-history-types';

export function activate(context: vscode.ExtensionContext) {

    // Collection of resources which should be released.
    const disposable: vscode.Disposable[] = [];

    // Instantiate a new local history manager.
    const manager: LocalHistoryManager = new LocalHistoryManager();

    disposable.push(
        // Displays the local history of the active file.
        vscode.commands.registerCommand(Commands.VIEW_HISTORY, (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }
            manager.viewHistory(uri);

        })
    );

    // Command which reverts the active editor to its previous revision.
    disposable.push(
        vscode.commands.registerTextEditorCommand(Commands.REVERT_TO_PREVIOUS_REVISION, () => {
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
        vscode.commands.registerCommand(Commands.REMOVE_REVISION, (revision) => {
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
        vscode.commands.registerCommand(Commands.CLEAR_HISTORY, (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }
            manager.clearHistory(uri);
        })
    );

    // Command which removes old revisions.
    disposable.push(
        vscode.commands.registerCommand(Commands.CLEAR_OLD_HISTORY, async () => {
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

    //Triggers autocomplete for '**/.local-history' in json files
    disposable.push(vscode.languages.registerCompletionItemProvider({ language: 'json', scheme: '*' }, {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {

            // A completion item which inserts `**/.local-history`
            const localHistorySettingCompletion = new vscode.CompletionItem('"**/.local-history/**"');

            // Return all completion items as array
            return [
                localHistorySettingCompletion
            ];
        }
    }));

    context.subscriptions.push(...disposable);

    // Tree View
    const treeProvider = new LocalHistoryTreeProvider(manager);
    vscode.window.registerTreeDataProvider('localHistoryTree', treeProvider);
    vscode.commands.registerCommand(Commands.TREE_REFRESH, () => treeProvider.refresh());
    vscode.commands.registerCommand(Commands.TREE_DIFF, uri =>
        manager.displayDiff(vscode.Uri.file(uri), vscode.window.activeTextEditor!.document.uri));
}

export function deactivate() { }
