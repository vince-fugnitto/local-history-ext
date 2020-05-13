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

/**
 * Controls the maximum acceptable file size for storing revisions.
 */
export const FILE_SIZE_LIMIT: LocalHistoryPreference = {
    id: 'local-history.fileSizeLimit',
    default: 25
};
