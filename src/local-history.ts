import * as vscode from 'vscode';

export class LocalHistoryProvider {

    /**
     * View all history for file currently open in the active editor
     */
    public viewActiveAll(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit): void {
        let historyFiles: string[] = ['placeholder 1', 'placeholder 2', 'placeholder 3'];

        vscode.window.showQuickPick(historyFiles,
            { placeHolder: 'Please select a file in history to be opened' })

    }


}