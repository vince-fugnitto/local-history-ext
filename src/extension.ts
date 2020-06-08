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

    // Command which displays the local history of the active file.
    disposable.push(
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
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
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
                vscode.window.showWarningMessage(`Are you sure you want to permanently delete '${path.basename(editors[0].document.fileName)}'?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        manager.removeRevision(editors[0].document.uri, editors[1].document.uri, true);
                    }
                });
            } else if (revision) {
                // No diff opened, click 'Remove revision' from tree-view
                vscode.window.showWarningMessage(`Are you sure you want to permanently delete '${path.basename(revision.uri)}'?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        manager.removeRevision(vscode.Uri.file(revision.uri), vscode.window.activeTextEditor!.document.uri);
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

    // Triggers autocomplete for '**/.local-history' in json files
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

    // Triggers opening the external documentation link.
    disposable.push(vscode.commands.registerCommand(Commands.VIEW_DOCUMENTATION, () => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://github.com/vince-fugnitto/local-history-ext#documentation'));
    }));

    // Command which writes the revision path of the active editor into the clipboard.
    disposable.push(
        vscode.commands.registerCommand(Commands.COPY_REVISION_PATH, (uri: vscode.Uri) => {
            if (uri === undefined) {
                uri = vscode.window.activeTextEditor!.document.uri;
            }

            manager.copyRevisionPath(uri);
        })
    );

    // Command which writes the revision path of the given workspace into the clipboard.
    disposable.push(
        vscode.commands.registerCommand(Commands.COPY_REVISION_PATH_WORKSPACE, (uri: vscode.Uri) => {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
                return;
            } else if (uri === undefined) {
                uri = vscode.workspace.workspaceFolders![0].uri;
            }

            manager.copyRevisionPathWorkspace(uri);
        })
    );

    context.subscriptions.push(...disposable);

    // Local History Tree View.
    const treeDataProvider = new LocalHistoryTreeProvider(manager);
    const treeView = vscode.window.createTreeView('localHistoryTree', {
        treeDataProvider,
        canSelectMany: false,
        showCollapseAll: false
    });

    // Update the message.
    treeView.message = treeDataProvider.getTreeViewMessage();
    treeDataProvider.onDidChangeTreeData(() => {
        treeView.message = treeDataProvider.getTreeViewMessage();
    });
    vscode.window.onDidChangeActiveTextEditor(() => {
        treeView.message = treeDataProvider.getTreeViewMessage();
    });

    vscode.commands.registerCommand(Commands.TREE_REFRESH, () => treeDataProvider.refresh());
    vscode.commands.registerCommand(Commands.TREE_DIFF, uri =>
        manager.displayDiff(vscode.Uri.file(uri), vscode.window.activeTextEditor!.document.uri));
}

export function deactivate() { }
