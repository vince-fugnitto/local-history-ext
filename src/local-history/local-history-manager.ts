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
    parentFileName: string;
}

export class LocalHistoryManager {

    private historyFiles: any[] = [];
    private localHistoryPreferenceService: LocalHistoryPreferenceService = new LocalHistoryPreferenceService();

    constructor() {
        this.loadLocalHistory();
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.loadLocalHistory();
        });
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            this.saveActiveEditorContext(document);
        });
    }

    /**
    * Load existing entries on activation from local file system.
    */
    public async loadLocalHistory(): Promise<void> {

        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
            return;
        }

        this.historyFiles = [];

        const workspaceFolderPath = vscode.workspace.workspaceFolders![0].uri;
        const historyFolderPath = path.join(workspaceFolderPath.fsPath, '.local-history');
        const folderUri = workspaceFolderPath.with({ path: historyFolderPath });

        // .local-history folder does not exist.
        if (!fs.existsSync(historyFolderPath)) {
            return;
        }

        for (const [fileName, type] of await vscode.workspace.fs.readDirectory(folderUri)) {
            if (type === vscode.FileType.File) {
                const parentFileName = fileName.match('^[^_/]*')![0] + fileName.match('.[0-9a-z]+$')![0];
                const data: HistoryFileProperties = {
                    fileName: fileName,
                    timestamp: this.parseTimestamp(fileName),
                    uri: path.join(folderUri.path, fileName),
                    parentFileName: parentFileName
                };
                this.historyFiles.unshift(data);
            }
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
            items = items.slice(0, this.localHistoryPreferenceService.maxEntriesPerFile);
            vscode.window.showQuickPick(items,
                {
                    placeHolder: `Please select a local history revision for '${path.basename(textEditor.document.fileName)}'`,
                    matchOnDescription: true,
                    matchOnDetail: true
                }).then((selection) => {
                    // User made final selection.
                    if (!selection) {
                        return;
                    }

                    // Get the file system path for the selection.
                    const selectionFsPath = path.join(`${workspaceFolderPath}`, selection.description!);

                    // Show the diff between the active editor and the selected local history file.
                    this.displayDiff(vscode.Uri.file(selectionFsPath), textEditor.document.uri);
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
    public async saveActiveEditorContext(document: vscode.TextDocument): Promise<void> {
        const timestamp = this.getCurrentTime();
        const timestampForFileName = timestamp.replace(/[-:. ]/g, '');
        const timestampForProperty = timestamp.substring(0, 19);
        const fileFullPath = path.parse(document.fileName);
        const historyFileName = `${fileFullPath.name}_${timestampForFileName.substring(0, 14)}_${timestampForFileName.substring(14, 17)}${fileFullPath.ext}`;

        if (vscode.workspace.getWorkspaceFolder(document.uri) !== undefined) {
            const userHome = path.join(os.homedir(), '.local-history');
            // Create .local-history folder if it does not exist.
            if (!fs.existsSync(userHome)) {
                fs.mkdirSync(userHome, { recursive: true });
            }
            const hashedUri = checksum(document.fileName);
            const hashedFolderPath = path.join(userHome, hashedUri);

            if (!fs.existsSync(hashedFolderPath)) {
                fs.mkdirSync(hashedFolderPath, { recursive: true });
            }
            // Copy the content of the current active editor.
            const historyFilePath = path.join(hashedFolderPath, historyFileName);
            const data: HistoryFileProperties = {
                fileName: historyFileName,
                timestamp: timestampForProperty,
                uri: historyFilePath,
                parentFileName: fileFullPath.base
            };
            this.historyFiles.unshift(data);
            try {
                const activeDocumentContent: string = await this.readFile(document.fileName);
                await this.writeFile(historyFilePath, activeDocumentContent);
            } catch (err) {
                console.log(err);
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
    public async revertActiveEditorToPrevRevision(previous: vscode.TextEditor, current: vscode.TextEditor): Promise<void> {
        if (current && previous) {
            const fileContent = await this.readFile(previous.document.fileName);
            await this.writeFile(current.document.fileName, fileContent);
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
                    const workspaceFolderPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
                    const revisionPath = path.join(workspaceFolderPath, '.local-history', path.basename(revision.document.fileName));

                    fs.unlink(revisionPath, (err) => {
                        if (err && err.code === 'ENOENT') {
                            vscode.window.showInformationMessage('File is not a revision.');
                            return;
                        }
                        else if (err) {
                            vscode.window.showInformationMessage(err.message);
                            return;
                        }
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');

                        // Reload the local history entries.

                        vscode.window.showInformationMessage(`'${path.basename(revision.document.fileName)}' was deleted.`);

                        this.loadLocalHistory();
                    });
                }
            });
        }
    }
}
