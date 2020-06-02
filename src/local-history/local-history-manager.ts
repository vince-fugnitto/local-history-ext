import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LocalHistoryPreferencesService } from './local-history-preferences-service';
import * as os from 'os';
import * as moment from 'moment';
import * as minimatch from 'minimatch';
import { TextDecoder, TextEncoder } from 'util';

import { HistoryFileProperties, LOCAL_HISTORY_DIRNAME, DAY_TO_MILLISECONDS, Commands } from './local-history-types';
import { OutputManager } from './local-history-output-manager';

export class LocalHistoryManager {

    private _historyFilesForActiveEditor: HistoryFileProperties[] = [];
    private localHistoryPreferencesService: LocalHistoryPreferencesService = new LocalHistoryPreferencesService();

    constructor() {
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            this.saveEditorContext(document);
            vscode.commands.executeCommand(Commands.TREE_REFRESH);
        });

        vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
            this.checkPermission(event.document);
        });

        vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
            this.saveEditorContext(document);
        });
    }

    /**
     * Get the array that stores the local history of the active editor.
     */
    get historyFilesForActiveEditor(): HistoryFileProperties[] {
        return this._historyFilesForActiveEditor;
    }

    /**
     * Load local history for the active file.
     */
    public async loadHistory(revisionFolderPath: string): Promise<void> {

        this._historyFilesForActiveEditor = [];

        try {
            for (const [fileName, type] of await vscode.workspace.fs.readDirectory(vscode.Uri.file(revisionFolderPath))) {
                if (type === vscode.FileType.File) {
                    const data: HistoryFileProperties = {
                        fileName: fileName,
                        timestamp: this.parseTimestamp(fileName),
                        uri: path.join(revisionFolderPath, fileName),
                    };
                    this._historyFilesForActiveEditor.unshift(data);
                }
            }
        } catch (err) {
            OutputManager.appendWarningMessage([`An error has occurred when reading the ${LOCAL_HISTORY_DIRNAME} directory`, err]);
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
     * View all local history of the active file.
     */
    public viewHistory(uri: vscode.Uri): void {
        if (uri) {
            const revisionFolderPath = this.getRevisionFolderPath(uri.fsPath);

            this.loadHistory(revisionFolderPath).then(() => {
                let items: vscode.QuickPickItem[] = this._historyFilesForActiveEditor.map(item => ({
                    label: `$(calendar) ${item.timestamp}`,
                    description: path.basename(item.uri),
                    detail: `Last modified ${moment(item.timestamp.replace(/[-: ]/g, ''), 'YYYYMMDDhhmmss').fromNow()}`
                }));

                if (items.length === 0) {
                    vscode.window.showInformationMessage(`No local history found for '${path.basename(uri.fsPath)}'`);
                    return;
                }

                // Limits the number of entries based on the preference 'local-history.maxEntriesPerFile`.
                items = items.slice(0, this.localHistoryPreferencesService.maxEntriesPerFile);
                vscode.window.showQuickPick(items,
                    {
                        placeHolder: `Please select a local history revision for '${path.basename(uri.fsPath)}'`,
                        matchOnDescription: true
                    }).then((selection) => {
                        // User made final selection.
                        if (!selection) {
                            return;
                        }

                        // Get the file system path for the selection.
                        const selectionFsPath = path.join(revisionFolderPath, selection.description!);

                        // Show the diff between the active file and the selected local history file.
                        this.displayDiff(vscode.Uri.file(selectionFsPath), uri);
                    });
            });
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
        if (!this.fileSizeLimit(document) || this.isFileExcluded(document)) {
            return;
        }

        const timestamp = this.getCurrentTime();
        const timestampForFileName = timestamp.replace(/[-:. ]/g, '');
        const fileFullPath = path.parse(document.fileName);
        const historyFileName = `${fileFullPath.name}_${timestampForFileName.substring(0, 14)}_${timestampForFileName.substring(14, 17)}${fileFullPath.ext}`;
        const revisionFolderPath = this.getRevisionFolderPath(document.fileName);

        // Create a folder (and all the parent folders) for storing all the local history file for the active editor.
        if (!fs.existsSync(revisionFolderPath)) {
            fs.mkdirSync(revisionFolderPath, { recursive: true });
        }

        try {
            const historyFilePath = path.join(revisionFolderPath, historyFileName);
            // Copy the content of the current active editor.
            const activeDocumentContent: string = await this.readFile(document.fileName);
            const mostRecentRevision = this.getMostRecentRevision(revisionFolderPath);
            if (mostRecentRevision) {
                const mostRecentRevisionContent: string = await this.readFile(mostRecentRevision);
                if (this.historyFileTimeDifference(document) && mostRecentRevisionContent && !(activeDocumentContent === mostRecentRevisionContent)) {
                    if (!this.checkRevisionLimit(document)) {
                        await this.writeFile(historyFilePath, activeDocumentContent, true);
                        return;
                    }
                }
                else {
                    fs.renameSync(mostRecentRevision, historyFilePath);
                    await this.writeFile(historyFilePath, activeDocumentContent, true);
                    return;
                }
                if (this.checkRevisionLimit(document)) {
                    this.removeOldestRevision(document);
                }
            }
            await this.writeFile(historyFilePath, activeDocumentContent, true);
        }
        catch (err) {
            OutputManager.appendWarningMessage(['An error has occurred when saving the active editor content', err]);
        }
    }

    /**
     * Compare the two revisions and show the diff between them.
     */
    public displayDiff(previous: vscode.Uri, current: vscode.Uri): void {
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
                await this.writeFile(current.document.fileName, fileContent, false);
            } catch (err) {
                OutputManager.appendWarningMessage(['An error has occurred when reverting to previous revision', err]);
            }
        }
    }

    /**
     * Reads the contents of the file.
     * @param uri: the uri of the file to be read.
     */
    private async readFile(uri: string | vscode.Uri): Promise<string> {
        const fileUri: vscode.Uri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const content: Uint8Array = await vscode.workspace.fs.readFile(fileUri);
        return new TextDecoder().decode(content);
    }

    /**
     * Writes the content to a file.
     * @param uri: the target uri for the new file.
     * @param content: the data to be stored in the file.
     * @param isReadonly: controls whether to modify the file as 'readonly'.
     */
    private async writeFile(uri: string | vscode.Uri, content: string, isReadonly: boolean): Promise<void> {
        const fileUri: vscode.Uri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const encodedContent = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(fileUri, encodedContent);

        if (isReadonly) {
            // Change file permission to read-only.
            fs.chmod(typeof uri === 'string' ? uri : uri.fsPath, 0o400, (err) => {
                if (err) {
                    OutputManager.appendWarningMessage(err.message);
                }
            });
        }
    }

    /**
     * Remove the active revision of a file.
     */
    public removeRevision(revision: vscode.Uri, diffActive?: boolean): void {
        if (revision) {
            // Remove the revision.
            fs.unlink(revision.fsPath, (err) => {
                if (err) {
                    OutputManager.appendWarningMessage('An error has occurred when removing the revision');
                    return;
                }

                if (diffActive) {
                    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                } else {
                    // If diff is opened (but not active), close the diff window after the revision is removed
                    vscode.workspace.openTextDocument(revision).then(async doc => {
                        await vscode.window.showTextDocument(doc);
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    });
                }

                vscode.window.showInformationMessage(`'${path.basename(revision.fsPath)}' was deleted.`);
                vscode.commands.executeCommand(Commands.TREE_REFRESH);
            });
        }
    }

    /**
     * Removes all revisions of the active file.
     * @param uri: the uri of the active file.
     */
    public clearHistory(uri: vscode.Uri): void {
        if (uri) {
            const revisionFolderPath = this.getRevisionFolderPath(uri.fsPath);

            // Check if local history exists for the active file
            if (!fs.existsSync(revisionFolderPath)) {
                vscode.window.showInformationMessage(`No local history found for '${path.basename(uri.fsPath)}'`);
                return;
            }

            try {
                vscode.window.showWarningMessage(`Are you sure you want to permanently delete all revisions for '${path.basename(uri.fsPath)}'?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        const files = fs.readdirSync(revisionFolderPath);
                        for (const file of files) {
                            fs.unlinkSync(path.join(revisionFolderPath, file));
                        }
                        fs.rmdirSync(revisionFolderPath);
                        vscode.window.showInformationMessage(`All revisions for '${path.basename(uri.fsPath)}' were deleted.`);
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
                    }
                });
            } catch (err) {
                OutputManager.appendWarningMessage([`An error has occurred when removing all the revision for ${path.basename(uri.fsPath)}`, err.message]);
            }
        }
    }

    /**
     * Gets the most recent revision of the file.
     * If no previous revisions for the file are found, will return undefined.
     * @param directoryUri the directory uri which has the revisions of the targeted file.
     */
    private getMostRecentRevision(directoryUri: string): string | undefined {
        // Collect the list of revisions sorted by the most recent modified time.
        const revisions = fs.readdirSync(directoryUri).sort((a, b) => this.compareModificationTime(directoryUri, a, b));
        return revisions[0] ? path.join(directoryUri, revisions[0]) : undefined;
    }

    /**
     * Gets the oldest revision of the file.
     * If no previous revisions for the file are found, will return undefined.
     * @param directoryUri the directory uri which has the revisions of the targeted file.
     */
    private getOldestRevision(directoryUri: string): string | undefined {
        // Collect the list of revisions sorted by the most recent modified time.
        const revisions = fs.readdirSync(directoryUri).sort((a, b) => this.compareModificationTime(directoryUri, a, b));
        return revisions[revisions.length - 1] ? path.join(directoryUri, revisions[revisions.length - 1]) : undefined;
    }

    /**
     * Compare two revisions based on their modified time (in milliseconds).
     * @param directoryUri the directory URI.
     * @param a the first revision path.
     * @param b the second revision path.
     */
    private compareModificationTime(directoryUri: string, a: string, b: string): number {
        return (
            fs.statSync(path.join(directoryUri, b)).mtimeMs - fs.statSync(path.join(directoryUri, a)).mtimeMs
        );
    }

    /**
     * Checks to see if the elapsed time from last revision to present is greater than the preference time.
     * @param document Represent the active text document.
     */
    private historyFileTimeDifference(document: vscode.TextDocument): boolean {
        const currentTime = Date.now();
        const revisionFolderPath = this.getRevisionFolderPath(document.fileName);
        const recentRevision = this.getMostRecentRevision(revisionFolderPath);
        if (recentRevision) {
            const recentRevisionTime = fs.statSync(recentRevision).mtimeMs;
            const timeDifference = currentTime - recentRevisionTime;
            if (timeDifference > this.localHistoryPreferencesService.saveDelay) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns the revision folder path of the uri.
     * @param activeEditorUri the file URI.
     */
    public getRevisionFolderPath(activeEditorUri: string): string {
        const editorUri = activeEditorUri.replace(/[\:/]/g, path.sep);
        const historyFolderPath = path.normalize(path.join(os.homedir(), LOCAL_HISTORY_DIRNAME));
        const revisionFolderPath = path.normalize(path.join(historyFolderPath, editorUri));

        return revisionFolderPath;
    }

    /**
     * Check if the active text document is read-only.
     */
    private checkPermission(document: vscode.TextDocument): void {
        if ((fs.statSync(document.uri.fsPath).mode & 146) === 0) {
            // Document is in read-only mode.
            vscode.window.showErrorMessage('Revision is read-only.');
            vscode.commands.executeCommand('undo');
        }
    }

    /**
     * Clears all history files which are last modified @param days ago.
     * @param days The number of days.
     */
    public removeOldFiles(days: number): void {
        const dirPath = path.join(os.homedir(), LOCAL_HISTORY_DIRNAME);
        if (!fs.existsSync(dirPath)) {
            return;
        }
        try {
            const folders = fs.readdirSync(dirPath);
            const currentDate = Date.now();
            const fileUris: string[] = [];
            for (const folder of folders) {
                const revisionFolderPath = path.join(os.homedir(), LOCAL_HISTORY_DIRNAME, folder);
                const files = fs.readdirSync(revisionFolderPath);
                files.filter((file) => {
                    const filePath = path.join(revisionFolderPath, file);
                    const mTime = fs.statSync(filePath).mtimeMs;
                    if (currentDate - mTime > days * DAY_TO_MILLISECONDS) {
                        fileUris.push(filePath);
                    }
                });
            }
            if (fileUris.length) {
                vscode.window.showWarningMessage(`Are you sure you want to permanently delete ${fileUris.length} revision(s)?`, { modal: true }, 'Delete').then((selection) => {
                    if (selection === 'Delete') {
                        for (const file of fileUris) {
                            fs.unlinkSync(file);
                        }
                        this.removeEmptyFolders();
                        vscode.window.showInformationMessage(`Successfully deleted ${fileUris.length} local-history file(s).`);
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
                    }
                });
            } else {
                vscode.window.showInformationMessage(`No local-history found older than ${days} day(s).`);
            }
        }
        catch (err) {
            OutputManager.appendErrorMessage(err.toString());
        }
    }

    /**
     * Checks the size of file in active editor against the preference value 'fileSizeLimit'
     * @param document Represent the active text document.
     */
    private fileSizeLimit(document: vscode.TextDocument): boolean {
        const sizeInBytes = fs.statSync(document.uri.fsPath).size;
        const sizeInMegaBytes = sizeInBytes / 1000000;
        if (sizeInMegaBytes > this.localHistoryPreferencesService.fileSizeLimit) {
            return false;
        }
        return true;
    }

    /**
     * Checks the number of revisions of a file against the preference 'File-Limit' value
     * @param document Represent the active text document.
     */
    private checkRevisionLimit(document: vscode.TextDocument): boolean {
        const revisionFolderPath = this.getRevisionFolderPath(document.uri.fsPath);
        try {
            const files = fs.readdirSync(revisionFolderPath);
            if (files.length >= this.localHistoryPreferencesService.fileLimit) {
                return true;
            }
        } catch (err) {
            OutputManager.appendErrorMessage(err.toString());
        }
        return false;
    }

    /**
     * Removes the oldest history file for the active text document.
     * @param document Represent the active text document.
     */
    private removeOldestRevision(document: vscode.TextDocument): void {
        if (this.checkRevisionLimit(document)) {
            const revisionFolderPath = this.getRevisionFolderPath(document.uri.fsPath);
            const oldestRevision = this.getOldestRevision(revisionFolderPath);
            if (oldestRevision) {
                fs.unlinkSync(oldestRevision);
            }
            if (!fs.readdirSync(revisionFolderPath).length) {
                fs.rmdirSync(revisionFolderPath);
            }
        }
    }

    /**
     * Exclude the revisions of sources which follows the glob pattern.
     * @param document Represent the active text document.
     */
    private isFileExcluded(document: vscode.TextDocument): boolean {
        const glob = Object.keys(this.localHistoryPreferencesService.excludedFiles);
        const documentUri = path.normalize(document.uri.fsPath);
        for (const pattern of glob) {
            const match = minimatch(documentUri, pattern);
            if (match) {
                return true;
            }
        }
        return false;
    }

    /**
     * Removes empty folders.
     */
    private removeEmptyFolders() {
        const localHistoryDir = path.normalize(path.join(os.homedir(), LOCAL_HISTORY_DIRNAME));
        const folders = fs.readdirSync(localHistoryDir);
        for (const folder of folders) {
            const folderPath = path.normalize(path.join(localHistoryDir, folder));
            if (!fs.readdirSync(folderPath).length) {
                fs.rmdirSync(folderPath);
            }
        }
    }

    /**
     * Writes the revision path of the active editor into the clipboard.
     */
    public async copyRevisionPath(uri: vscode.Uri): Promise<void> {
        if (uri) {
            const revisionFolderPath = this.getRevisionFolderPath(uri.fsPath);

            if (!fs.existsSync(revisionFolderPath)) {
                vscode.window.showInformationMessage(`No revision folder found for '${path.basename(uri.fsPath)}'`);
                return;
            }

            await vscode.env.clipboard.writeText(revisionFolderPath);
        }
    }

    /**
     * Writes the revision path of the given workspace into the clipboard.
     */
    public async copyRevisionPathWorkspace(uri: vscode.Uri): Promise<void> {
        const revisionFolderPath = this.getRevisionFolderPath(uri.fsPath);

        if (!fs.existsSync(revisionFolderPath)) {
            vscode.window.showInformationMessage('No revision folder found for the current workspace.');
            return;
        }

        await vscode.env.clipboard.writeText(revisionFolderPath);
    }

}
