/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LocalHistoryPreferencesService } from './local-history-preferences-service';
import * as os from 'os';
import * as moment from 'moment';
import * as minimatch from 'minimatch';
import { TextDecoder, TextEncoder } from 'util';
import * as deleteEmpty from 'delete-empty';
import * as findRemoveSync from 'find-remove';

import { HistoryFileProperties, LOCAL_HISTORY_DIRNAME, DAY_TO_MILLISECONDS, Commands, WorkspaceQuickPickItem } from './local-history-types';
import { OutputManager } from './local-history-output-manager';
import * as shelljs from 'shelljs';

export class LocalHistoryManager {

    private _historyFilesForActiveEditor: HistoryFileProperties[] = [];
    private localHistoryPreferencesService: LocalHistoryPreferencesService = new LocalHistoryPreferencesService();

    constructor() {
        vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
            await this.saveEditorContext(document);
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

        if (!fs.existsSync(revisionFolderPath)) {
            return;
        }

        try {
            const files = fs.readdirSync(revisionFolderPath);
            for (const file of files) {
                const filePath = path.join(revisionFolderPath, file);
                if (fs.statSync(filePath).isFile()) {
                    const data: HistoryFileProperties = {
                        fileName: file,
                        timestamp: this.parseTimestamp(file),
                        uri: path.join(revisionFolderPath, file),
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
                const items: vscode.QuickPickItem[] = this._historyFilesForActiveEditor.map(item => ({
                    label: `$(calendar) ${item.timestamp}`,
                    description: path.basename(item.uri),
                    detail: `Last modified ${moment(item.timestamp.replace(/[-: ]/g, ''), 'YYYYMMDDhhmmss').fromNow()}`
                }));

                if (items.length === 0) {
                    vscode.window.showInformationMessage(`No local history found for '${path.basename(uri.fsPath)}'`);
                    return;
                }

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
    public async saveEditorContext(document: vscode.TextDocument, isRevertChange?: boolean): Promise<void> {
        if (!this.fileSizeLimit(document) || this.isFileExcluded(document)) {
            return;
        }

        const activeDocumentContent: string = await this.readFile(document.fileName);

        if (activeDocumentContent.length === 0) {
            return;
        }

        const timestamp = this.getCurrentTime();
        const timestampForFileName = timestamp.replace(/[-:. ]/g, '');
        const fileFullPath = path.parse(document.fileName);
        // Revision was created either before a revert change 'r' or after a manual change 'm'
        const revisionContext = isRevertChange ? 'r' : 'm';
        const historyFileName = `${fileFullPath.name}_${timestampForFileName.substring(0, 14)}_${timestampForFileName.substring(14, 17)}_${revisionContext}${fileFullPath.ext}`;

        const revisionFolderPath = this.getRevisionFolderPath(document.fileName);

        // Create a folder (and all the parent folders) for storing all the local history file for the active editor.
        if (!fs.existsSync(revisionFolderPath)) {
            shelljs.mkdir('-p', revisionFolderPath);
        }

        try {
            const historyFilePath = path.join(revisionFolderPath, historyFileName);
            // Copy the content of the current active editor.
            const mostRecentRevision = this.getMostRecentRevision(revisionFolderPath);
            if (!isRevertChange && mostRecentRevision) {
                const mostRecentRevisionContent: string | undefined = mostRecentRevision && await this.readFile(mostRecentRevision);
                if (this.historyFileTimeDifference(document) && mostRecentRevisionContent && !(activeDocumentContent === mostRecentRevisionContent)) {
                    if (!this.checkRevisionLimit(document)) {
                        await this.writeFile(historyFilePath, activeDocumentContent, true);
                        OutputManager.appendInfoMessage(`A new revision ${historyFileName} for ${fileFullPath.base} has been created at ${timestamp}.`);
                        return;
                    }
                }
                else if (activeDocumentContent === mostRecentRevisionContent) {
                    return;
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
            OutputManager.appendInfoMessage(`A new revision ${historyFileName} for ${fileFullPath.base} has been created at ${timestamp}.`);
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
     * Revert the current active editor to one of its previous revision.
     */
    public async revertToPrevRevision(previous: vscode.Uri): Promise<void> {
        let current = path.dirname(previous.fsPath.split(`${path.sep}.local-history${path.sep}`)[1]);

        // Add : for Windows drive
        if (os.platform() === 'win32') {
            current = `${current.slice(0, 1)}:${current.slice(1)}`;
        }

        vscode.window.showWarningMessage(`Are you sure you want to revert '${path.basename(current)}' to its previous state?`,
            { modal: true }, 'Revert').then(async (selection) => {
                if (selection === 'Revert') {
                    const revisionContent: string | undefined = await this.readFile(previous);
                    const activeDocumentContent: string = await this.readFile(current);
                    if (revisionContent && (activeDocumentContent === revisionContent)) {
                        // Prevent user from reverting to the same revision more than once.
                        // Prevent duplicate 'revert change' revision.
                        return;
                    }

                    try {
                        vscode.workspace.openTextDocument(current).then(async doc => {
                            await this.saveEditorContext(doc, true);
                        });

                        const previousContent: string | undefined = await this.readFile(previous);
                        await this.writeFile(current, previousContent, false);
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
                        OutputManager.appendInfoMessage(`The editor has been reverted to its previous revision (${path.basename(previous.fsPath)}).`);
                    } catch (err) {
                        OutputManager.appendWarningMessage([`An error has occurred when reverting the editor to its previous revision (${path.basename(previous.fsPath)}).`, err]);
                    }
                }
            });
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
        if (fs.existsSync(typeof uri === 'string' ? uri : uri.fsPath)) {
            // Changes the file permission to 'WRITE'. 
            this.modifyFilePermissions(uri, '200');
        }
        const fileUri: vscode.Uri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const encodedContent = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(fileUri, encodedContent);

        if (isReadonly) {
            // Change file permission to read-only.
            this.modifyFilePermissions(uri, '400');
        }
    }

    /**
     * Recursively deletes all empty folders in the workspace revision directory.
     */
    private removeEmptyFoldersRec(activeEditorUri: vscode.Uri): void {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
            return;
        }

        const currentWorkspace = vscode.workspace.getWorkspaceFolder(activeEditorUri)!.uri;
        const workspaceRevisionPath = this.getRevisionFolderPath(currentWorkspace.fsPath);
        deleteEmpty.sync(workspaceRevisionPath);
    }

    /**
     * Removes a revision of the active editor.
     */
    public removeRevision(revisionUri: vscode.Uri, activeEditorUri: vscode.Uri, diffActive?: boolean): void {
        if (revisionUri) {
            // Remove the revision.
            fs.unlink(revisionUri.fsPath, (err) => {
                if (err) {
                    OutputManager.appendWarningMessage('An error has occurred when removing the revision');
                    return;
                }

                if (diffActive) {
                    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                } else {
                    // If diff is opened (but not active), close the diff window after the revision is removed
                    vscode.workspace.openTextDocument(revisionUri).then(async doc => {
                        await vscode.window.showTextDocument(doc);
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    });
                }

                this.removeEmptyFoldersRec(activeEditorUri);
                vscode.window.showInformationMessage(`'${path.basename(revisionUri.fsPath)}' was deleted.`);
                OutputManager.appendInfoMessage(`'${path.basename(revisionUri.fsPath)}' has been deleted.`);
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
                        this.removeEmptyFoldersRec(uri);
                        vscode.window.showInformationMessage(`All revisions for '${path.basename(uri.fsPath)}' were deleted.`);
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
                        OutputManager.appendInfoMessage(`All revisions for ${path.basename(uri.fsPath)} has been deleted.`);
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
        if (fs.existsSync(document.fileName) && (fs.statSync(document.uri.fsPath).mode & 146) === 0) {
            // Document is in read-only mode.
            vscode.window.showErrorMessage('Revision is read-only.');
            vscode.commands.executeCommand('undo');
        }
    }

    /**
     * Clears history files that are last modified @param days ago for the selected workspace.
     * @param days the number of days to clear from. 
     */
    public removeHistoryFromWorkspace(days: number): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length <= 0) {
            return;
        }
        const workspaces: WorkspaceQuickPickItem[] = workspaceFolders.map(workspace => ({
            label: workspace.name,
            description: workspace.uri.fsPath,
            uri: workspace.uri,
        }));
        vscode.window.showQuickPick(workspaces, {
            placeHolder: 'Please select a workspace for clearing older history files.',
            matchOnDescription: true
        }).then((selection) => {
            if (!selection) {
                return;
            }
            const workspaceRevisionPath = this.getRevisionFolderPath(selection.description!);
            if (!fs.existsSync(workspaceRevisionPath)) {
                vscode.window.showInformationMessage(`No local history found for '${path.basename(selection.description!)}'`);
                return;
            }
            try {
                vscode.window.showWarningMessage(`Are you sure you want to permanently delete revision(s) older than ${days} day(s)?`, { modal: true }, 'Delete').then(async (promptSelection) => {
                    if (promptSelection === 'Delete') {
                        const age = days * DAY_TO_MILLISECONDS / 1000;
                        const deletedFiles = findRemoveSync(workspaceRevisionPath, { files: '*.*', age: { seconds: age } });
                        const deletedFilesCount = Object.keys(deletedFiles).length;
                        this.removeEmptyFoldersRec(selection.uri);
                        vscode.window.showInformationMessage(deletedFilesCount > 0 ? `Successfully deleted ${deletedFilesCount} revision(s) older than ${days} day(s) in selected workspace revision folder.` : `No revisions older than ${days} day(s) were found for the selected workspace.`);
                        OutputManager.appendInfoMessage(deletedFilesCount > 0 ? `Successfully deleted ${deletedFilesCount} revision(s) older than ${days} day(s) for workspace ${selection.label}.` : `No revisions older than ${days} day(s) were found for the workspace ${selection.label}.`);
                        vscode.commands.executeCommand(Commands.TREE_REFRESH);
                    }
                });
            }
            catch (err) {
                OutputManager.appendErrorMessage(err.toString());
            }
        });
    }

    /**
     * Checks to see if the file size of the active editor is within the preference value 'fileSizeLimit'
     * @param document Represent the active text document.
     */
    private fileSizeLimit(document: vscode.TextDocument): boolean {
        if (fs.existsSync(document.fileName)) {
            const sizeInBytes = fs.statSync(document.uri.fsPath).size;
            const sizeInMegaBytes = sizeInBytes / 1000000;
            if (sizeInMegaBytes > this.localHistoryPreferencesService.fileSizeLimit) {
                return false;
            }
            return true;
        }
        return false;
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

    /**
     * Modifies the permission of a file. 
     * @param uri the path of source file. 
     * @param filePermissions File mode for modifying permissions. 
     */
    private modifyFilePermissions(uri: string | vscode.Uri, filePermissions: string) {
        fs.chmod(typeof uri === 'string' ? uri : uri.fsPath, filePermissions, (err) => {
            if (err) {
                OutputManager.appendWarningMessage(err.message);
            }
        });
    }

}
