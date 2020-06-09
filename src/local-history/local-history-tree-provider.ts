import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
// eslint-disable-next-line no-unused-vars
import { LocalHistoryManager } from './local-history-manager';
import { OutputManager } from './local-history-output-manager';

export class Revision extends vscode.TreeItem {
    uri: string;

    constructor(label: string, uri: string, command: vscode.Command) {
        super(label);
        this.label = label;
        this.uri = uri;
        this.command = command;
        this.iconPath = vscode.ThemeIcon.File;
    }

    get tooltip(): string {
        return `Open '${path.basename(this.uri)}'`;
    }

    get description(): string {
        return `Last modified ${moment(this.label!.replace(/[-: ]/g, ''), 'YYYYMMDDhhmmss').fromNow()}`;
    }
}

export class LocalHistoryTreeProvider implements vscode.TreeDataProvider<Revision> {
    private _onDidChangeTreeData: vscode.EventEmitter<Revision | undefined> = new vscode.EventEmitter<Revision | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Revision | undefined> = this._onDidChangeTreeData.event;
    readonly manager: LocalHistoryManager;

    constructor(manager: LocalHistoryManager) {
        this.manager = manager;

        vscode.window.onDidChangeActiveTextEditor(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Revision): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<Revision[]> {
        if (vscode.window.activeTextEditor === undefined) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getRevisionsActiveEditor(vscode.window.activeTextEditor!.document.uri.fsPath));
        }
    }

    /**
     * Get all revisions for active editor
     */
    private async getRevisionsActiveEditor(editorPath: string): Promise<Revision[]> {
        const revisions: Revision[] = [];
        const revisionFolderPath = this.manager.getRevisionFolderPath(editorPath);
        await this.manager.loadHistory(revisionFolderPath);
        const history = this.manager.historyFilesForActiveEditor;
        history.forEach(item => {
            revisions.push(new Revision(item.timestamp, item.uri, {
                command: 'extension.openRevisionInDiff',
                title: '',
                arguments: [item.uri],
                tooltip: item.uri
            }));
        });
        return revisions;
    }

    /**
     * Get the human-readable message of the filename.
     * @returns the human-readable message of the filename.
     */
    getTreeViewMessage(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor?.document.uri.scheme !== 'file') {
            return 'No active editor opened.';
        }
        let revisionsExist: boolean = false;
        try {
            revisionsExist = fs.readdirSync(this.manager.getRevisionFolderPath(editor.document.fileName)).length !== 0;
        } catch (e) {
            OutputManager.appendWarningMessage(['An error has occurred when updating the tree view message', e]);
        }
        const basename = path.basename(editor.document.fileName);
        return revisionsExist ? basename : `No history found for '${basename}'.`;
    }
}
