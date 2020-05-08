import * as assert from 'assert';
import * as mocha from 'mocha';
import * as vscode from 'vscode';
import { LocalHistoryPreferencesService } from '../../local-history/local-history-preferences-service';
import { MAX_ENTRIES_PER_FILE, SAVE_DELAY } from '../../local-history/local-history-preferences';

mocha.suite('LocalHistoryPreferencesService', () => {

    let service: LocalHistoryPreferencesService;

    mocha.beforeEach(() => {
        vscode.window.showInformationMessage('preferences');
        service = new LocalHistoryPreferencesService();
    });

    mocha.afterEach(async () => {
        service.maxEntriesPerFile = MAX_ENTRIES_PER_FILE.default;
        service.saveDelay = SAVE_DELAY.default;
    });

    mocha.describe(`Preference: '${MAX_ENTRIES_PER_FILE.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            assert.equal(service.maxEntriesPerFile, MAX_ENTRIES_PER_FILE.default);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: number = 100;
            service.maxEntriesPerFile = updatedValue;
            assert.equal(service.maxEntriesPerFile, updatedValue);
        });
    });

    mocha.describe(`Preference: '${SAVE_DELAY.id}'`, () => {
        mocha.it('should return the correct default value', () => {
            assert.equal(service.saveDelay, SAVE_DELAY.default);
        });
        mocha.it('should properly update the value', () => {
            const updatedValue: number = 10;
            service.saveDelay = updatedValue;
            assert.equal(service.saveDelay, updatedValue);
        });
    });

    mocha.describe('Method: getPreferenceValueById', () => {
        mocha.it(`should properly return the '${MAX_ENTRIES_PER_FILE.id}' preference`, () => {
            assert.equal(service['getPreferenceValueById'](MAX_ENTRIES_PER_FILE.id), MAX_ENTRIES_PER_FILE.default);
        });
        mocha.it(`should properly return the '${SAVE_DELAY.id}' preference`, () => {
            assert.equal(service['getPreferenceValueById'](SAVE_DELAY.id), SAVE_DELAY.default);
        });
    });

});
