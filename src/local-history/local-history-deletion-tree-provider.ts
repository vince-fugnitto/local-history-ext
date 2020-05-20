import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as moment from 'moment';
import { LocalHistoryManager } from './local-history-manager';
import { HistoryFileProperties, LOCAL_HISTORY_DIRNAME, LOCAL_HISTORY_DELETION_DIRNAME } from './local-history-types';

export class DeletedFile extends vscode.TreeItem {
    uri: string;
    timestamp: string;

    constructor(label: string, uri: string, timestamp: string, command: vscode.Command) {
        super(label);
        this.label = label;
        this.uri = uri;
        this.timestamp = timestamp;
        this.command = command;
    }

    get tooltip(): string {
        return `Open '${path.basename(this.uri)}'`;
    }

    get description(): string {
        return `Deleted ${moment(this.timestamp).fromNow()}`;
    }
}

export class LocalHistoryDeletionTreeProvider implements vscode.TreeDataProvider<DeletedFile> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeletedFile | undefined> = new vscode.EventEmitter<DeletedFile | undefined>();
    readonly onDidChangeTreeData: vscode.Event<DeletedFile | undefined> = this._onDidChangeTreeData.event;
    readonly manager: LocalHistoryManager;

    constructor(manager: LocalHistoryManager) {
        this.manager = manager;

        vscode.workspace.onDidDeleteFiles(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeletedFile): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<DeletedFile[]> {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getWorkspaceDeletedFiles(vscode.workspace.workspaceFolders[0].uri.fsPath));
        }
    }

    /**
     * Get all deleted files for the workspace
     */
    private async getWorkspaceDeletedFiles(workspacePath: string): Promise<DeletedFile[]> {
        const deletions: DeletedFile[] = [];
        const hashedWorkspacePath = vscode.Uri.file(path.normalize(path.join(os.homedir(), LOCAL_HISTORY_DIRNAME, LOCAL_HISTORY_DELETION_DIRNAME, this.manager.checksum(workspacePath))));

        if (!fs.existsSync(hashedWorkspacePath.fsPath)) {
            return deletions;
        } else {
            await this.readDirRec(hashedWorkspacePath);
            const deletedFiles = this.manager.workspaceDeletedFiles;

            deletedFiles.forEach(item => {
                deletions.push(new DeletedFile(item.fileName, item.uri, item.timestamp, {
                    command: 'extension.openDeletedFile',
                    title: '',
                    arguments: [item.uri]
                }));
            });

            return deletions;
        }

    }

    /**
     * Read a directory recursively.
     */
    private async readDirRec(folderUri: vscode.Uri): Promise<void> {
        for (const [fileName, type] of await vscode.workspace.fs.readDirectory(folderUri)) {
            if (type === vscode.FileType.File) {
                const data: HistoryFileProperties = {
                    fileName: fileName,
                    timestamp: `${moment(fs.statSync(path.join(folderUri.fsPath, fileName)).birthtimeMs).format()}`,
                    uri: path.join(folderUri.fsPath, fileName),
                };
                if (!this.manager.workspaceDeletedFiles.find(prop => prop.uri === data.uri)) {
                    this.manager.workspaceDeletedFiles.unshift(data);
                }
            }
            else if (type === vscode.FileType.Directory) {
                const childFolderUri = folderUri.with({ path: path.join(folderUri.fsPath, fileName) });
                this.readDirRec(childFolderUri);
            }
        }
    }
}
