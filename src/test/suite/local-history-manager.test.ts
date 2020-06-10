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

import * as assert from 'assert';
import * as mocha from 'mocha';
import * as vscode from 'vscode';
import { LocalHistoryManager } from '../../local-history/local-history-manager';
import { MockTextDocument } from './mock-text-document';

mocha.suite('LocalHistoryManager', () => {

    let manager: LocalHistoryManager;

    mocha.beforeEach(() => {
        vscode.window.showInformationMessage('manager');
        manager = new LocalHistoryManager();
    });

    mocha.describe('Method: parseTimestamp', () => {
        mocha.it('should properly parse the timestamp', () => {
            const a: string = 'package_20200508153953_150.json';
            const b: string = 'foobar_19940311081234_100.ts';
            assert.equal(manager['parseTimestamp'](a), '2020-05-08 15:39:53');
            assert.equal(manager['parseTimestamp'](b), '1994-03-11 08:12:34');
        });
    });

    mocha.describe('Method: isFileExcluded', () => {
        mocha.it('it should properly exclude `.local-history` files', async () => {
            const uri = vscode.Uri.parse('.local-history/a/a.ts');
            const document: MockTextDocument = new MockTextDocument(uri, '');
            const match = manager['isFileExcluded'](document);
            assert.equal(match, true);
        });
        mocha.it('it should properly exclude nested `.local-history` files', async () => {
            const uri = vscode.Uri.parse('.local-history/a/b/c/a.ts');
            const document: MockTextDocument = new MockTextDocument(uri, '');
            const match = manager['isFileExcluded'](document);
            assert.equal(match, true);
        });
        mocha.it('it should properly exclude `.local-history` files as a subdirectory', async () => {
            const uri = vscode.Uri.parse('foo/bar/.local-history/a.ts');
            const document: MockTextDocument = new MockTextDocument(uri, '');
            const match = manager['isFileExcluded'](document);
            assert.equal(match, true);
        });
        mocha.it('it should return `false` for files which are not excluded', async () => {
            const uri = vscode.Uri.parse('foo/bar/a.ts');
            const document: MockTextDocument = new MockTextDocument(uri, '');
            const match = manager['isFileExcluded'](document);
            assert.equal(match, false);
        });
    });

});
