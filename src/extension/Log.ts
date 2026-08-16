import * as vscode from 'vscode';

let channel: vscode.LogOutputChannel | undefined;

/**
 * The "STXT" channel of the Output panel. It is a LogOutputChannel, so VS Code stamps
 * every line with a timestamp and a level and honours the level chosen with the
 * "Developer: Set Log Level…" command. That level defaults to Info: whatever is
 * logged with trace() does not reach the panel unless the user raises it.
 */
export function getLogChannel(): vscode.LogOutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel('STXT', { log: true });
	}
	return channel;
}

/**
 * The extension log. Rule of use:
 * - trace: per-keystroke messages (analysis, completion).
 * - info: infrequent milestones (schema load and reload).
 * - warn/error: failures not shown to the user in any other way.
 */
export const log = {
	trace(message: string, ...args: unknown[]): void {
		getLogChannel().trace(message, ...args);
	},
	debug(message: string, ...args: unknown[]): void {
		getLogChannel().debug(message, ...args);
	},
	info(message: string, ...args: unknown[]): void {
		getLogChannel().info(message, ...args);
	},
	warn(message: string, ...args: unknown[]): void {
		getLogChannel().warn(message, ...args);
	},
	error(error: string | Error, ...args: unknown[]): void {
		getLogChannel().error(error, ...args);
	}
};
