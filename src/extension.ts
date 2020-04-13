import * as vscode from 'vscode';
import { LocalHistoryProvider } from './local-history';

export function activate(context: vscode.ExtensionContext) {
    const provider = new LocalHistoryProvider();

    let disposable = vscode.commands.registerCommand('local-history.echo', () => {
        vscode.window.showInformationMessage('\'Local History\' is active.');
    });
    context.subscriptions.push(disposable);

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('local-history.viewAllForActiveEditor',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                provider.viewAllForActiveEditor(editor);
            }
        }
    ));

    // Create history on save document
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        provider.saveActiveEditorContext(document);
    });
}

export function deactivate() { }
