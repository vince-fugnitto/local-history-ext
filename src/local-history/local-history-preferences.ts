/**
 * Describes a local-history preference.
 */
type LocalHistoryPreference = {
    /**
     * The unique identifier for the preference.
     */
    id: string;
    /**
     * The default value for the preference.
     */
    default: any;
};

/**
 * Controls the number of entries allowed for a given resource for display purposes.
 */
export const MAX_ENTRIES_PER_FILE: LocalHistoryPreference = {
    id: 'local-history.maxEntriesPerFile',
    default: 10
};

/**
 * Controls the saving behavior when creating local-history revisions.
 */
export const SAVE_DELAY: LocalHistoryPreference = {
    id: 'local-history.saveDelay',
    default: 5000
};

export class LocalHistoryPreferences {

    private _maxEntriesPerFile: number = MAX_ENTRIES_PER_FILE.default;
    private _saveDelay: number = SAVE_DELAY.default;

    /**
     * Get the save delay in milliseconds.
     */
    get saveDelay(): number {
        return this._saveDelay;
    }

    /**
     * Set the save delay.
     * @param the save delay in milliseconds.
     */
    set saveDelay(delay: number) {
        this._saveDelay = delay;
    }

    /**
     * Get the maximum allowed entries for a given file.
     */
    get maxEntriesPerFile(): number {
        return this._maxEntriesPerFile;
    }

    /**
     * Set the maximum allowed entries for a given file.
     * @param max the maximum allowed number of entries.
     */
    set maxEntriesPerFile(max: number) {
        this._maxEntriesPerFile = max;
    }
}

