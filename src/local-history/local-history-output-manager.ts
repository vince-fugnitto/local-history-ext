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
import * as moment from 'moment';

/**
 * Representation of different severity log levels.
 */
enum Severity {
    INFO = 'Info',
    WARNING = 'Warning',
    ERROR = 'Error',
}

export class OutputManager {

    private static outputChannel: vscode.OutputChannel;
    /**
     * Logs the message in the output channel, with 'INFO' severity.
     * @param messages The logged messages.
     */
    static appendInfoMessage(messages: string | string[]) {
        this.appendMessage(Severity.INFO, messages);
    }

    /**
     * Logs the message in the output channel, with 'WARNING' severity.
     * @param messages The logged messages.
     */
    static appendWarningMessage(messages: string | string[]) {
        this.appendMessage(Severity.WARNING, messages);
    }

    /**
     * Logs the message in the output channel, with 'ERROR' severity.
     * @param messages The logged messages.
     */
    static appendErrorMessage(messages: string | string[]) {
        this.appendMessage(Severity.ERROR, messages);
    }

    /**
     * Logs the message in the output channel.
     * @param severity The type of message.
     * @param messages The logged messages.
     */
    private static appendMessage(severity: Severity, messages: string | string[]): void {
        const outputChannel = this.setupChannel();
        const timestamp = moment().format('hh:mm:ss:ms');
        if (typeof messages === 'string') {
            outputChannel.appendLine(this.toLog(severity, timestamp, messages));
            return;
        }
        messages.forEach((message: string) => {
            outputChannel.appendLine(this.toLog(severity, timestamp, message));
        });
    }

    /**
     * Prints message to output channel.
     * @param severity Representation of log level.
     * @param timestamp Log time.
     * @param message The logged messages.
     */
    private static toLog(severity: Severity, timestamp: string, message: string): string {
        return `[${severity} - ${timestamp}]: ${message}`;
    }

    /**
     * Creates an output channel.
     */
    private static setupChannel(): vscode.OutputChannel {
        if (!OutputManager.outputChannel) {
            OutputManager.outputChannel = vscode.window.createOutputChannel('Local History');
        }
        return OutputManager.outputChannel;
    }
}
