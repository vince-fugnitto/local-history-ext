import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('local-history.echo', () => {
		vscode.window.showInformationMessage('\'Local History\' is active.');
	});
	context.subscriptions.push(disposable);
}

export function deactivate() { }
