import * as vscode from 'vscode';

/**
 * Collection of local history preferences.
 */
export namespace LocalHistoryPreferences {
    /**
     * Controls the maximum number of entries of a file for display purposes.
     */
    export const maxEntriesPerFile = 'local-history.maxEntriesPerFile';

    /**
     * Controls the allowed delay for autosaving a local history file.
     */
    export const autoSaveDelay = 'local-history.autoSaveDelay';
}

export class LocalHistoryPreferenceService {

    /**
     * The maximum number of entries for a given file.
     */
    private _maxEntriesPerFile: number = 10;

    /**
     * The delay for automatically saving a history
     */
    private _autoSaveDelay: number = 5000;

    constructor() {
        // Set the maximum number of entries for a given file.
        this.maxEntriesPerFile = this.getMaxEntriesPerFile();
        // Sets the auto save delay for a given file
        this.autoSaveDelay = this.getAutoSaveDelay();
        // Listen for changes to the preference configuration.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            // If we determine that the preference has been updated, update the max to the new value.
            if (event.affectsConfiguration(LocalHistoryPreferences.maxEntriesPerFile)) {
                this.maxEntriesPerFile = this.getMaxEntriesPerFile();
            }
            // If we determine that the preference has been updated, update the delay to the new value.
            if (event.affectsConfiguration(LocalHistoryPreferences.autoSaveDelay)) {
                this.autoSaveDelay = this.getAutoSaveDelay();
            }
        });
    }

    /**
     * Gets the allowed delay for auto saving a local history
     */
    get autoSaveDelay(): number {
        return this._autoSaveDelay;
    }

    /**
     * Sets the allowed delay for auto saving a local history
     * @param delay the allowed delay in ms for autosaving.
     */
    set autoSaveDelay(delay: number) {
        this._autoSaveDelay = delay;
    }
    /**
     * Get the maximum allowed local history entries for a file.
     */
    get maxEntriesPerFile(): number {
        return this._maxEntriesPerFile;
    }

    /**
     * Set the maximum allowed local history entries for a file.
     * @param max the maximum number of entries allowed.
     */
    set maxEntriesPerFile(max: number) {
        this._maxEntriesPerFile = max;
    }

    /**
     * Get the maximum number of entries for a file based on the preference configuration.
     *
     * @returns the maximum number of entries allowed.
     */
    private getMaxEntriesPerFile(): number {
        return vscode.workspace.getConfiguration().get(LocalHistoryPreferences.maxEntriesPerFile) as number;
    }

    /**
     * Gets the allowed delay for autosaving a local history file based on the preference configuration
     * 
     * @returns the allowed delay for local history files.
     */
    private getAutoSaveDelay(): number {
        return vscode.workspace.getConfiguration().get(LocalHistoryPreferences.autoSaveDelay) as number;
    }
}
