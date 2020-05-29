import * as fs from 'fs';
import * as vscode from 'vscode';
import { TextEncoder, TextDecoder } from 'util';

/**
 * Collection of filesystem utility methods.
 */
export class FilesystemService {
    /**
     * Write a file.
     * @param uri the uri of the resource.
     * @param content the content of the resource.
     */
    static async writeFile(uri: string | vscode.Uri, content: string, isReadonly?: boolean): Promise<void> {
        const fileUri: vscode.Uri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const encodedContent = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(fileUri, encodedContent);
        if (isReadonly) {
            // Change file permission to read-only.
            fs.chmod(typeof uri === 'string' ? uri : uri.fsPath, 0o400, (err) => {
               console.log(err);
            });
        }
    }
    /**
     * Read a file.
     * @param uri the uri of the resource.
     */
    static async readFile(uri: string | vscode.Uri): Promise<string> {
        const fileUri: vscode.Uri = typeof uri === 'string' ? vscode.Uri.file(uri) : uri;
        const content: Uint8Array = await vscode.workspace.fs.readFile(fileUri);
        return new TextDecoder().decode(content);
    }

}
