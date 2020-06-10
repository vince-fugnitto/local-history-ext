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
import { LocalHistoryPreferencesService } from '../../local-history/local-history-preferences-service';
import { Preferences } from '../../local-history/local-history-types';

mocha.suite('LocalHistoryPreferencesService', () => {

    let service: LocalHistoryPreferencesService;

    mocha.beforeEach(() => {
        vscode.window.showInformationMessage('preferences');
        service = new LocalHistoryPreferencesService();
    });

    mocha.afterEach(async () => {
        service.saveDelay = Preferences.SAVE_DELAY.default;
    });

    mocha.describe(`Preference: '${Preferences.FILE_LIMIT.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            assert.equal(service.fileLimit, Preferences.FILE_LIMIT.default);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: number = 10;
            service.fileLimit = updatedValue;
            assert.equal(service.fileLimit, updatedValue);
        });
    });

    mocha.describe(`Preference: '${Preferences.FILE_SIZE_LIMIT.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            assert.equal(service.fileSizeLimit, Preferences.FILE_SIZE_LIMIT.default);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: number = 10;
            service.fileSizeLimit = updatedValue;
            assert.equal(service.fileSizeLimit, updatedValue);
        });
    });

    mocha.describe(`Preference: '${Preferences.SAVE_DELAY.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            assert.equal(service.saveDelay, Preferences.SAVE_DELAY.default);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: number = 10;
            service.saveDelay = updatedValue;
            assert.equal(service.saveDelay, updatedValue);
        });
    });

    mocha.describe(`Preference: '${Preferences.EXCLUDE_FILES.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            const mergedDefault: Object = {
                '**/.DS_Store': true,
                '**/.git': true,
                '**/.hg': true,
                '**/.local-history/**': true,
                '**/.svn': true,
                '**/CVS': true
            };
            const glob: Object = { '**/.local-history/**': true };
            assert.deepEqual(glob, Preferences.EXCLUDE_FILES.default);
            assert.deepEqual(service.excludedFiles, mergedDefault);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: object = { '**/*.txt': true };
            service.excludedFiles = updatedValue;
            assert.equal(service.excludedFiles, updatedValue);
        });
    });

    mocha.describe('Method: getPreferenceValueById', () => {
        mocha.it(`should properly return the '${Preferences.FILE_LIMIT.id}' preference`, () => {
            assert.equal(service['getPreferenceValueById'](Preferences.FILE_LIMIT.id), Preferences.FILE_LIMIT.default);
        });
        mocha.it(`should properly return the '${Preferences.FILE_SIZE_LIMIT.id}' preference`, () => {
            assert.equal(service['getPreferenceValueById'](Preferences.FILE_SIZE_LIMIT.id), Preferences.FILE_SIZE_LIMIT.default);
        });
        mocha.it(`should properly return the '${Preferences.SAVE_DELAY.id}' preference`, () => {
            assert.equal(service['getPreferenceValueById'](Preferences.SAVE_DELAY.id), Preferences.SAVE_DELAY.default);
        });
        mocha.it(`should properly return the '${Preferences.EXCLUDE_FILES.id}' preference`, () => {
            assert.deepEqual(service['getPreferenceValueById'](Preferences.EXCLUDE_FILES.id), Preferences.EXCLUDE_FILES.default);
        });
    });

});
