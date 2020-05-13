/**
 * The number of milliseconds in a day.
 */
export const DAY_TO_MILLISECONDS = 86400000;
/**
 * The local history directory name.
 */
export const LOCAL_HISTORY_DIRNAME = '.local-history';

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
 * Representation of local history file properties.
 */
export interface HistoryFileProperties {
    /**
     * The filename for the file.
     */
    fileName: string;
    /**
     * The timestamp for the file.
     */
    timestamp: string;
    /**
     * The uri for the file.
     */
    uri: string;
}

/**
 * Collection of local history preferences.
 */
export namespace Preferences {

    /**
     * Exclude the local history for the files.
     */
    export const EXCLUDE_FILES: LocalHistoryPreference = {
        id: 'local-history.excludeFiles',
        default: {
            '**/.local-history/**': true,
        }
    };

    /**
     * Limits the maximum number of revisions saved per file.
     */
    export const FILE_LIMIT: LocalHistoryPreference = {
        id: 'local-history.fileLimit',
        default: 30
    };

    /**
     * Controls the maximum acceptable file size for storing revisions.
     */
    export const FILE_SIZE_LIMIT: LocalHistoryPreference = {
        id: 'local-history.fileSizeLimit',
        default: 5
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
        default: 300000
    };

}

/**
 * Collection of local history commands.
 */
export namespace Commands {
    export const CLEAR_HISTORY = 'local-history.clearHistory';
    export const CLEAR_OLD_HISTORY = 'local-history.clearOldHistory';
    export const REMOVE_REVISION = 'local-history.removeRevision';
    export const COPY_REVISION_PATH = 'local-history.copyRevisionPath';
    export const COPY_REVISION_PATH_WORKSPACE = 'local-history.copyRevisionPathWorkspace';
    export const REVERT_TO_PREVIOUS_REVISION = 'local-history.revertToPrevRevision';
    export const TREE_DIFF = 'extension.openRevisionInDiff';
    export const TREE_REFRESH = 'local-history.refreshEntry';
    export const VIEW_DOCUMENTATION = 'local-history:viewDocumentation';
    export const VIEW_HISTORY = 'local-history.viewHistory';
}
