import * as assert from 'assert';
import * as mocha from 'mocha';
import * as vscode from 'vscode';
import { LocalHistoryManager } from '../../local-history/local-history-manager';

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

});
