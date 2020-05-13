import * as vscode from 'vscode';
import { MAX_ENTRIES_PER_FILE, SAVE_DELAY, FILE_SIZE_LIMIT } from './local-history-preferences';

export class LocalHistoryPreferencesService {

    private _maxEntriesPerFile: number = MAX_ENTRIES_PER_FILE.default;
    private _saveDelay: number = SAVE_DELAY.default;
    private _fileSizeLimit: number = FILE_SIZE_LIMIT.default;

    constructor() {
        this.maxEntriesPerFile = this.getMaxEntriesPerFile();
        this.saveDelay = this.getSaveDelay();
        this.fileSizeLimit = this.getFileSizeLimit();

        // Listen to changes to the preferences configuration and update accordingly.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(MAX_ENTRIES_PER_FILE.id)) {
                this.maxEntriesPerFile = this.getMaxEntriesPerFile();
            }
            if (event.affectsConfiguration(SAVE_DELAY.id)) {
                this.saveDelay = this.getSaveDelay();
            }
            if (event.affectsConfiguration(FILE_SIZE_LIMIT.id)) {
                this.fileSizeLimit = this.getFileSizeLimit();
            }
        });
    }

    /**
     * Get the maximum allowed entries for a file.
     * @returns the maximum allowed entries for a file.
     */
    get maxEntriesPerFile(): number {
        return this._maxEntriesPerFile;
    }

    /**
     * Set the maximum allowed entries for a file.
     * @param max the maximum allowed entries for a file.
     */
    set maxEntriesPerFile(max: number) {
        this._maxEntriesPerFile = max;
    }

    /**
     * Get the save delay in milliseconds.
     * @returns the save delay in milliseconds.
     */
    get saveDelay(): number {
        return this._saveDelay;
    }

    /**
     * Set the save delay.
     * @param delay the save delay in milliseconds.
     */
    set saveDelay(delay: number) {
        this._saveDelay = delay;
    }

    /**
     * Get the file size limit in megabytes.
     * @returns the file size limit in megabytes.
     */
    get fileSizeLimit(): number {
        return this._fileSizeLimit;
    }

    /**
     * Set the file size limit.
     * @param limit the file size limit in megabytes.
     */
    set fileSizeLimit(limit: number) {
        this._fileSizeLimit = limit;
    }

    /**
     * Get the configuration value for the given preference id.
     * @param id the unique identifier for the preference.
     * @returns the configuration value.
     */
    private getPreferenceValueById(id: string): any {
        return vscode.workspace.getConfiguration().get(id);
    }

    /**
     * Get the configuration value for `MAX_ENTRIES_PER_FILE`.
     */
    private getMaxEntriesPerFile(): number {
        const value = this.getPreferenceValueById(MAX_ENTRIES_PER_FILE.id);
        return typeof value === 'number' ? value : MAX_ENTRIES_PER_FILE.default as number;
    }

    /**
     * Get the configuration value for `SAVE_DELAY`.
     */
    private getSaveDelay(): number {
        const value = this.getPreferenceValueById(SAVE_DELAY.id);
        return typeof value === 'number' ? value : SAVE_DELAY.default as number;
    }

    /**
     * Get the configuration value for 'FILE_SIZE_LIMIT'
     */
    private getFileSizeLimit(): number {
        const value = this.getPreferenceValueById(FILE_SIZE_LIMIT.id);
        return typeof value === 'number' ? value : FILE_SIZE_LIMIT.default as number;
    }
}
