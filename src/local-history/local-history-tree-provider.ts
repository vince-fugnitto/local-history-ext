import * as vscode from 'vscode';
import * as path from 'path';
import * as moment from 'moment';
// eslint-disable-next-line no-unused-vars
import { LocalHistoryManager } from './local-history-manager';

export class Revision extends vscode.TreeItem {
    uri: string;

    constructor(label: string, uri: string, command: vscode.Command) {
        super(label);
        this.label = label;
        this.uri = uri;
        this.command = command;
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
    private async getRevisionsActiveEditor(editor: string): Promise<Revision[]> {
        const revisions: Revision[] = [];
        const hashedFolderPath = this.manager.getHashedFolderPath(editor);
        await this.manager.loadHistory(hashedFolderPath);
        const history = this.manager.historyFilesForActiveEditor;
        history.forEach(item => {
            revisions.push(new Revision(item.timestamp, item.uri, {
                command: 'extension.openRevisionInDiff',
                title: '',
                arguments: [item.uri]
            }));
        });
        return revisions;
    }
}
