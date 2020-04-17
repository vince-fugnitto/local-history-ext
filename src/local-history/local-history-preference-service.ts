import * as vscode from 'vscode';

/**
 * Collection of local history preferences.
 */
export namespace LocalHistoryPreferences {
    /**
     * Controls the maximum number of entries of a file for display purposes.
     */
    export const maxEntriesPerFile = 'local-history.maxEntriesPerFile';
}

export class LocalHistoryPreferenceService {

    /**
     * The maximum number of entries for a given file.
     */
    private _maxEntriesPerFile: number = 10;

    constructor() {
        // Set the maximum number of entries for a given file.
        this.maxEntriesPerFile = this.getMaxEntriesPerFile();
        // Listen for changes to the preference configuration.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            // If we determine that the preference has been updated, update the max to the new value.
            if (event.affectsConfiguration(LocalHistoryPreferences.maxEntriesPerFile)) {
                this.maxEntriesPerFile = this.getMaxEntriesPerFile();
            }
        });
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

}
