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

import * as vscode from 'vscode';
import { Preferences } from './local-history-types';

export class LocalHistoryPreferencesService {

    private _excludedFiles: object = Preferences.EXCLUDE_FILES.default;
    private _fileLimit: number = Preferences.FILE_LIMIT.default;
    private _fileSizeLimit: number = Preferences.FILE_SIZE_LIMIT.default;
    private _saveDelay: number = Preferences.SAVE_DELAY.default;

    constructor() {
        this.excludedFiles = this.getExcludedFiles();
        this.fileLimit = this.getFileLimit();
        this.fileSizeLimit = this.getFileSizeLimit();
        this.saveDelay = this.getSaveDelay();

        // Listen to changes to the preferences configuration and update accordingly.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(Preferences.EXCLUDE_FILES.id || 'files.exclude')) {
                this.excludedFiles = this.getExcludedFiles();
            }
            if (event.affectsConfiguration(Preferences.FILE_LIMIT.id)) {
                this.fileLimit = this.getFileLimit();
            }
            if (event.affectsConfiguration(Preferences.FILE_SIZE_LIMIT.id)) {
                this.fileSizeLimit = this.getFileSizeLimit();
            }
            if (event.affectsConfiguration(Preferences.SAVE_DELAY.id)) {
                this.saveDelay = this.getSaveDelay();
            }
        });
    }

    /**
     * Get the excluded files.
     * @returns the excluded files.
     */
    get excludedFiles(): object {
        return this._excludedFiles;
    }

    /**
     * Set the excluded file
     * @param files the excluded files.
     */
    set excludedFiles(files: object) {
        this._excludedFiles = files;
    }

    /**
     * Get the revision limit for a file.
     * @returns the file limit.
     */
    get fileLimit(): number {
        return this._fileLimit;
    }

    /**
     * Sets the file limit
     * @param limit the limit for a file.
     */
    set fileLimit(limit: number) {
        this._fileLimit = limit;
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
     * Get the configuration value for the given preference id.
     * @param id the unique identifier for the preference.
     * @returns the configuration value.
     */
    private getPreferenceValueById(id: string): any {
        return vscode.workspace.getConfiguration().get(id);
    }

    /**
     * Get the configuration value for 'EXCLUDE_FILES'
     */
    private getExcludedFiles(): object {
        const value = this.getPreferenceValueById(Preferences.EXCLUDE_FILES.id);
        const filesExcludeValue = this.getPreferenceValueById('files.exclude');
        return typeof value === 'object' && typeof filesExcludeValue === 'object' ? { ...value, ...filesExcludeValue } : Preferences.EXCLUDE_FILES.default as object;
    }

    /**
     * Get the configuration value for 'FILE_LIMIT'
     *
     */
    private getFileLimit(): number {
        const value = this.getPreferenceValueById(Preferences.FILE_LIMIT.id);
        return typeof value === 'number' && value >= Preferences.FILE_LIMIT.minimum ? value : Preferences.FILE_LIMIT.default as number;
    }

    /**
     * Get the configuration value for 'FILE_SIZE_LIMIT'
     */
    private getFileSizeLimit(): number {
        const value = this.getPreferenceValueById(Preferences.FILE_SIZE_LIMIT.id);
        return typeof value === 'number' && value >= Preferences.FILE_SIZE_LIMIT.minimum ? value : Preferences.FILE_SIZE_LIMIT.default as number;
    }

    /**
     * Get the configuration value for `SAVE_DELAY`.
     */
    private getSaveDelay(): number {
        const value = this.getPreferenceValueById(Preferences.SAVE_DELAY.id);
        return typeof value === 'number' && value >= Preferences.SAVE_DELAY.minimum ? value : Preferences.SAVE_DELAY.default as number;
    }
}
