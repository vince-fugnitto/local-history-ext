import * as vscode from 'vscode';
import path = require('path');
import fs = require('fs');

export interface HistoryFileProperties {
    fileName: string;
    timeStamp: string;
    uri: string;
    parentFileName: string;
}

export class LocalHistoryProvider {

    private historyFiles: any[] = [];

    /**
     * View all history of the active editor
     */
    public viewAllForActiveEditor(textEditor: vscode.TextEditor): void {

        if (vscode.workspace.getWorkspaceFolder(textEditor.document.uri) !== undefined) {
            const workspaceFolderPath: string = vscode.workspace.getWorkspaceFolder(textEditor.document.uri)!.uri.fsPath;
            const activeEditor = path.parse(textEditor.document.fileName);

            const items: vscode.QuickPickItem[] = this.historyFiles.
                filter(item => item.parentFileName === (activeEditor.base)).
                map(item => ({
                    label: item.fileName,
                    description: item.timeStamp,
                    detail: vscode.workspace.asRelativePath(item.uri)
                }));

            if (items.length == 0) {
                vscode.window.showInformationMessage(`No local history file found for '${activeEditor.base}'`);
                return;
            }

            vscode.window.showQuickPick(items,
                {
                    placeHolder: 'Please select a file in history to open',
                    matchOnDescription: true,
                    matchOnDetail: true
                }).then((selection) => {
                    // User made final selection
                    if (!selection) {
                        return;
                    }

                    // get the file system path for the selection
                    const selectionFsPath = path.join(`${workspaceFolderPath}`, '.local-history', selection.label);
                    // create the document and show it in the UI
                    vscode.workspace.openTextDocument(selectionFsPath).then(doc => vscode.window.showTextDocument(doc), err => vscode.window.showInformationMessage(err.message));
                });
        }
        else {
            vscode.window.showInformationMessage('File does not belong to any workspace folder. Please save.');
        }
    }

    /**
     * Return the timestamp in the following format: 20200406102550_123.ts
     */
    private getCurrentTime(toISOString: boolean): string {
        let time = new Date();
        time = new Date(time.getTime() - (time.getTimezoneOffset() * 60000));
        if (toISOString) {
            return time.toISOString().substring(0, 19).replace(/[T]/g, ' ');
        }
        return time.toISOString().substring(0, 23).replace(/[-:T.]/g, '');
    }

    /**
     * Save the current context of the active editor
     */
    public saveActiveEditorContext(document: vscode.TextDocument): HistoryFileProperties | undefined {
        // get timestamp
        const timestamp = this.getCurrentTime(false);
        // filePath returns an absolute path     // use filePath.dir to get full directory path
        const fileFullPath = path.parse(document.fileName);
        const historyFileName = `${fileFullPath.name}_${timestamp.substring(0, 14)}_${timestamp.substring(14, 17)}${fileFullPath.ext}`;

        if (vscode.workspace.getWorkspaceFolder(document.uri) !== undefined) {
            const workspaceFolderPath: string = vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath;

            const historyFolderPath = path.join(workspaceFolderPath, '.local-history');

            // create .local-history folder if it does not exist
            if (!fs.existsSync(historyFolderPath)) {
                fs.mkdirSync(historyFolderPath, { recursive: true });
            }

            // copy the content of the current active editor
            const fileBuffer = fs.readFileSync(document.fileName);
            const historyFilePath = path.join(workspaceFolderPath, '.local-history', historyFileName);
            fs.writeFileSync(historyFilePath, fileBuffer);

            let data: HistoryFileProperties = {
                fileName: historyFileName,
                timeStamp: this.getCurrentTime(true),
                uri: historyFilePath,
                parentFileName: fileFullPath.name + fileFullPath.ext
            };

            this.historyFiles.push(data);
            return data;
        }
    }
}
