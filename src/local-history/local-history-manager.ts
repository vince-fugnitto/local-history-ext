import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LocalHistoryPreferenceService } from './local-history-preference-service';
import * as os from 'os';
import * as crypto from 'crypto';

function checksum(str: string, algorithm: string = 'md5') {
    return crypto
        .createHash(algorithm)
        .update(str, 'utf8')
        .digest('hex');
}

export interface HistoryFileProperties {
    fileName: string;
    timestamp: string;
    uri: string;
}

export class LocalHistoryManager {

    private historyFilesForActiveEditor: HistoryFileProperties[] = [];
    private localHistoryPreferenceService: LocalHistoryPreferenceService = new LocalHistoryPreferenceService();

    constructor() {
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            this.saveEditorContext(document);
        });
    }

    /**
     * Load existing entries on activation from local file system.
     */
    public async loadHistory(hashedFolderPath: string): Promise<void> {

        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
            return;
        }

        this.historyFilesForActiveEditor = [];
        const hashedFolderUri = vscode.Uri.file(hashedFolderPath);

        try {
            for (const [fileName, type] of await vscode.workspace.fs.readDirectory(hashedFolderUri)) {
                if (type === vscode.FileType.File) {
                    const data: HistoryFileProperties = {
                        fileName: fileName,
                        timestamp: this.parseTimestamp(fileName),
                        uri: path.join(hashedFolderPath, fileName),
                    };
                    this.historyFilesForActiveEditor.unshift(data);
                }
            }
        } catch (err) {
            console.warn('An error has occurred when reading the .local-history directory', err);
        }
    }

    /**
     * Parse the file name of a local history file into the format for file properties.
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
     * View all history of the active editor.
     */
    public viewHistory(editor: vscode.TextEditor): void {

        if (vscode.workspace.getWorkspaceFolder(editor.document.uri) !== undefined) {
            const hashedEditorPath = checksum(editor.document.fileName);
            const hashedFolderPath = path.join(os.homedir(), '.local-history', hashedEditorPath);

            this.loadHistory(hashedFolderPath).then(() => {
                let items: vscode.QuickPickItem[] = this.historyFilesForActiveEditor.map(item => ({
                    label: `$(calendar) ${item.timestamp}`,
                    description: path.basename(item.uri)
                }));

                if (items.length === 0) {
                    vscode.window.showInformationMessage(`No local history file found for '${path.basename(editor.document.fileName)}'`);
                    return;
                }

                // Limits the number of entries based on the preference 'local-history.maxEntriesPerFile`.
                items = items.slice(0, this.localHistoryPreferenceService.maxEntriesPerFile);
                vscode.window.showQuickPick(items,
                    {
                        placeHolder: `Please select a local history revision for '${path.basename(editor.document.fileName)}'`,
                        matchOnDescription: true,
                        matchOnDetail: true
                    }).then((selection) => {
                        // User made final selection.
                        if (!selection) {
                            return;
                        }

                        // Get the file system path for the selection.
                        const selectionFsPath = path.join(hashedFolderPath, selection.description!);

                        // Show the diff between the active editor and the selected local history file.
                        this.displayDiff(vscode.Uri.file(selectionFsPath), editor.document.uri);
                    });
            });
        }
        else {
            vscode.window.showInformationMessage('File does not belong to a workspace. Please save.');
        }
    }

    /**
     * Return the timestamp in the following format: 2020-04-06 10:25:50.123.
     */
    private getCurrentTime(): string {
        let time = new Date();
        time = new Date(time.getTime() - (time.getTimezoneOffset() * 60000));
        return time.toISOString().substring(0, 23).replace(/[T]/g, ' ');
    }

    /**
     * Save the current context of the active editor.
     */
    public async saveEditorContext(document: vscode.TextDocument): Promise<void> {
        const timestamp = this.getCurrentTime();
        const timestampForFileName = timestamp.replace(/[-:. ]/g, '');
        const fileFullPath = path.parse(document.fileName);
        const historyFileName = `${fileFullPath.name}_${timestampForFileName.substring(0, 14)}_${timestampForFileName.substring(14, 17)}${fileFullPath.ext}`;

        if (vscode.workspace.getWorkspaceFolder(document.uri) !== undefined) {
            const hashedEditorPath = checksum(document.fileName);
            const hashedFolderPath = path.join(os.homedir(), '.local-history', hashedEditorPath);

            // Create a folder (and all the parent folders) for storing all the local history file for the active editor.
            if (!fs.existsSync(hashedFolderPath)) {
                fs.mkdirSync(hashedFolderPath, { recursive: true });
            }

            try {
                const historyFilePath = path.join(hashedFolderPath, historyFileName);
                // Copy the content of the current active editor.
                const activeDocumentContent: string = await this.readFile(document.fileName);
                await this.writeFile(historyFilePath, activeDocumentContent);
            } catch (err) {
                console.warn('An error has occurred when saving the active editor content', err);
            }
        }
    }

    /**
     * Compare the two revisions and show the diff between them.
     */
    private displayDiff(previous: vscode.Uri, current: vscode.Uri): void {
        if (current && previous) {
            const tabTitle = path.basename(previous.fsPath) + ' <-> ' + path.basename(current.fsPath);
            vscode.commands.executeCommand('vscode.diff', previous, current, tabTitle);
        }
    }

    /**
     * Revert the current active editor to its previous revision.
     */
    public async revertToPrevRevision(previous: vscode.TextEditor, current: vscode.TextEditor): Promise<void> {
        if (current && previous) {
            try {
                const fileContent = await this.readFile(previous.document.fileName);
                await this.writeFile(current.document.fileName, fileContent);
            } catch (err) {
                console.warn('An error has occurred when reverting to previous revision', err);
            }
        }
    }

    /**
     * Reads the contents of the file.
     * @param uri: the uri of the file to be read.
     * @param encoding: the required conversion of data received by the stream.
     */
    private readFile(uri: string, encoding = 'utf8'): Promise<string> {
        const readStream = fs.createReadStream(uri, { encoding });
        return new Promise((resolve) => {
            let data = '';
            readStream.on('data', chunk => data += chunk);
            readStream.on('end', () => resolve(data));
        });
    }

    /**
     * Writes the content to a file.
     * @param uri: the target uri for the new file.
     * @param content: the data to be stored in the file
     */
    private writeFile(uri: string, content: string): Promise<string> {
        const writeStream = fs.createWriteStream(uri);
        return new Promise((resolve) => {
            writeStream.on('open', () => writeStream.write(content));
            writeStream.on('end', () => resolve());
        });
    }

    /**
     * Remove the active revision of a file.
     */
    public removeRevision(revision: vscode.TextEditor): void {
        if (revision) {
            vscode.window.showWarningMessage(`Are you sure you want to delete '${path.basename(revision.document.fileName)}' permanently?`, { modal: true }, 'Delete').then((selection) => {
                if (selection === 'Delete') {

                    // Remove the revision.
                    fs.unlink(revision.document.fileName, (err) => {
                        if (err) {
                            console.warn('An error has occurred when removing the revision', err.message);
                            return;
                        }
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                        vscode.window.showInformationMessage(`'${path.basename(revision.document.fileName)}' was deleted.`);
                    });
                }
            });
        }
    }
}
