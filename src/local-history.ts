import * as vscode from 'vscode';
import path = require('path');
import fs = require('fs');

export interface HistoryFileProperties {
    fileName: string;
    timestamp: string;
    uri: string;
    parentFileName: string;
}

export const maxEntriesPerFile = 'local-history.maxEntriesPerFile';

export class LocalHistoryProvider {
    private historyFiles: any[] = [];
    private maxEntriesPerFile: number = this.getMaxResultsPerFile();

    /**
    * Load existing entries on activation from local file system
    */
    public loadEntriesOnActivation(): void {
        const workspaceFolderPath: string = vscode.workspace.workspaceFolders![0].uri.path;
        const relativeSearchFolderPrefix = '/.local-history';

        fs.readdir(workspaceFolderPath + relativeSearchFolderPrefix, (err, files: string[]) => {
            files.forEach((historyFileName: string) => {
                const parentFileName = historyFileName.match('^[^_/]*')![0] + historyFileName.match('.[0-9a-z]+$')![0];
                const data: HistoryFileProperties = {
                    fileName: historyFileName,
                    timestamp: this.parseTimestamp(historyFileName),
                    uri: path.join(workspaceFolderPath, '.local-history', historyFileName),
                    parentFileName: parentFileName
                };
                this.historyFiles.unshift(data);
            });
        });
    }

    /**
     * Parse the file name of a local history file into the format for file properties
     */
    private parseTimestamp(fileName: string): string {
        const timestamp = fileName.match('_[^_]*')![0].substring(1);

        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        const second = timestamp.substring(12, 14);

        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    /**
     * View all history of the active editor
     */
    public viewAllForActiveEditor(textEditor: vscode.TextEditor): void {

        if (vscode.workspace.getWorkspaceFolder(textEditor.document.uri) !== undefined) {
            const workspaceFolderPath: string = vscode.workspace.getWorkspaceFolder(textEditor.document.uri)!.uri.fsPath;
            const activeEditor = path.parse(textEditor.document.fileName);

            let items: vscode.QuickPickItem[] = this.historyFiles.
                filter(item => item.parentFileName === (activeEditor.base)).
                map(item => ({
                    label: `$(calendar) ${item.timestamp}`,
                    description: vscode.workspace.asRelativePath(item.uri)
                }));

            if (items.length === 0) {
                vscode.window.showInformationMessage(`No local history file found for '${activeEditor.base}'`);
                return;
            }

            // Limits the number of entries based on the preference 'local-history.maxEntriesPerFile`.
            items = items.slice(0, this.maxEntriesPerFile);
            vscode.window.showQuickPick(items,
                {
                    placeHolder: `Please select a local history revision for '${path.basename(textEditor.document.fileName)}'`,
                    matchOnDescription: true,
                    matchOnDetail: true
                }).then((selection) => {
                    // User made final selection
                    if (!selection) {
                        return;
                    }

                    // Get the file system path for the selection
                    const selectionFsPath = path.join(`${workspaceFolderPath}`, '.local-history', selection.label);

                    // Show the diff between the active editor and the selected local history file
                    this.displayDiff(vscode.Uri.file(selectionFsPath), textEditor.document.uri);
                });
        }
        else {
            vscode.window.showInformationMessage('File does not belong to a workspace. Please save.');
        }
    }

    /**
     * Return the timestamp in the following format: 2020-04-06 10:25:50.123
     */
    private getCurrentTime(): string {
        let time = new Date();
        time = new Date(time.getTime() - (time.getTimezoneOffset() * 60000));
        return time.toISOString().substring(0, 23).replace(/[T]/g, ' ');
    }

    /**
     * Save the current context of the active editor
     */
    public saveActiveEditorContext(document: vscode.TextDocument): void {
        const timestamp = this.getCurrentTime();
        const timestampForFileName = timestamp.replace(/[-:. ]/g, '');
        const timestampForProperty = timestamp.substring(0, 19);
        const fileFullPath = path.parse(document.fileName);
        const historyFileName = `${fileFullPath.name}_${timestampForFileName.substring(0, 14)}_${timestampForFileName.substring(14, 17)}${fileFullPath.ext}`;

        if (vscode.workspace.getWorkspaceFolder(document.uri) !== undefined) {
            const workspaceFolderPath: string = vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath;

            const historyFolderPath = path.join(workspaceFolderPath, '.local-history');

            // Create .local-history folder if it does not exist
            if (!fs.existsSync(historyFolderPath)) {
                fs.mkdirSync(historyFolderPath, { recursive: true });
            }

            // Copy the content of the current active editor
            const fileBuffer = fs.readFileSync(document.fileName);
            const historyFilePath = path.join(workspaceFolderPath, '.local-history', historyFileName);
            fs.writeFileSync(historyFilePath, fileBuffer);

            const data: HistoryFileProperties = {
                fileName: historyFileName,
                timestamp: timestampForProperty,
                uri: historyFilePath,
                parentFileName: fileFullPath.base
            };
            this.historyFiles.unshift(data);
        }
    }

    /**
     * Compare the two revisions and show the diff between them
     */
    private displayDiff(previous: vscode.Uri, current: vscode.Uri): void {
        if (current && previous) {
            const tabTitle = path.basename(previous.fsPath) + ' <-> ' + path.basename(current.fsPath);
            vscode.commands.executeCommand('vscode.diff', previous, current, tabTitle);
        }
    }

    /**
     * Updates the value based on the current preference value set for 'local-history.maxEntriesPerFile'
     */
    public updateMaxEntriesPerFile(): void {
        this.maxEntriesPerFile = this.getMaxResultsPerFile();
    }

    /**
     * Get the number of max results for a given file based on the preference configuration.
     */
    private getMaxResultsPerFile(): number {
        return vscode.workspace.getConfiguration().get(maxEntriesPerFile) as number;
    }
}
