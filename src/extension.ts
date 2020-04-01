import * as vscode from 'vscode';
import { LocalHistoryProvider } from './local-history';

export function activate(context: vscode.ExtensionContext) {

	const provider = new LocalHistoryProvider();

	let disposable = vscode.commands.registerCommand('local-history.echo', () => {
		vscode.window.showInformationMessage('\'Local History\' is active.');
	});
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('local-history.viewActiveAll', provider.viewActiveAll));

}

export function deactivate() { }
