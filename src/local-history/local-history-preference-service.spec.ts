import { expect } from 'chai';
import { LocalHistoryPreferences, SAVE_DELAY, MAX_ENTRIES_PER_FILE } from './local-history-preferences';

describe('LocalHistoryPreferenceService', () => {

    let preferences: LocalHistoryPreferences;

    beforeEach(() => {
        preferences = new LocalHistoryPreferences();
    });

    describe('saveDelay', () => {
        it('should properly return the default value', () => {
            expect(preferences.saveDelay).equal(SAVE_DELAY.default);
        });
        it('should properly update', () => {
            const updatedValue: number = 10000;
            preferences.saveDelay = updatedValue;
            expect(preferences.saveDelay).equal(updatedValue);
        });
    });

    describe('maxEntriesPerFile', () => {
        it('should properly return the default value', () => {
            expect(preferences.maxEntriesPerFile).equal(MAX_ENTRIES_PER_FILE.default);
        });
        it('should properly update', () => {
            const updatedValue: number = 10;
            preferences.maxEntriesPerFile = updatedValue;
            expect(preferences.maxEntriesPerFile).equal(updatedValue);
        });
    });
});
