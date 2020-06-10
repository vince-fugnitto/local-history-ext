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

import * as vscode from 'vscode';

export class MockTextDocument implements vscode.TextDocument {

    languageId: string = '';

    isUntitled: boolean = false;
    isDirty: boolean = false;
    isClosed: boolean = false;

    eol: vscode.EndOfLine = vscode.EndOfLine.LF;

    private readonly _lines: string[];

    constructor(
        public readonly uri: vscode.Uri,
        private readonly _contents: string,
        public readonly version = 1,
    ) {
        this._lines = this._contents.split(/\n/g);
    }

    get fileName(): string {
        return this.uri.fsPath;
    }
    get lineCount(): number {
        return this._lines.length;
    }
    getText(_?: vscode.Range | undefined): never {
        throw new Error('');
    }
    getWordRangeAtPosition(_a: vscode.Position, _b?: RegExp): never {
        throw new Error('');
    }
    lineAt(_: any): never {
        throw new Error('');
    }
    offsetAt(_: vscode.Position): never {
        throw new Error('');
    }
    positionAt(_: number): never {
        throw new Error('');
    }
    save(): never {
        throw new Error('');
    }
    validatePosition(_: vscode.Position): never {
        throw new Error('');
    }
    validateRange(_: vscode.Range): never {
        throw new Error('');
    }
}
