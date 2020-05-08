import * as vscode from 'vscode';
import { LocalHistoryPreferences, MAX_ENTRIES_PER_FILE, SAVE_DELAY } from './local-history-preferences';

export class LocalHistoryPreferenceService {

    private _preferences: LocalHistoryPreferences;

    constructor() {
        this._preferences = new LocalHistoryPreferences();
        this._preferences.maxEntriesPerFile = this.getMaxEntriesPerFile();
        this._preferences.saveDelay = this.getSaveDelay();

        // Listen to changes to the preference values.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(MAX_ENTRIES_PER_FILE.id)) {
                this._preferences.maxEntriesPerFile = this.getMaxEntriesPerFile();
            }
            if (event.affectsConfiguration(SAVE_DELAY.id)) {
                this._preferences.saveDelay = this.getSaveDelay();
            }
        });
    }

    get preferences(): LocalHistoryPreferences {
        return this._preferences;
    }

    /**
     * Get the preference value from the configuration.
     * @param id the unique identifier for the preference.
     */
    private getPreferenceConfigById(id: string): any {
        return vscode.workspace.getConfiguration().get(id);
    }

    /**
     * Get the maximum entries allowed for a given file from the configuration.
     * @returns the maximum entries allowed for a file.
     */
    private getMaxEntriesPerFile(): number {
        return this.getPreferenceConfigById(MAX_ENTRIES_PER_FILE.id) as number;
    }

    /**
     * Get the save delay from the configuration.
     * @returns the save delay in milliseconds.
     */
    private getSaveDelay(): number {
        return this.getPreferenceConfigById(SAVE_DELAY.id) as number;
    }
}
