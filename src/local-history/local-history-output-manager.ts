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
        return vscode.window.createOutputChannel('Local History');
    }
}
