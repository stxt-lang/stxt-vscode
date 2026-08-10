import * as vscode from 'vscode';

let channel: vscode.LogOutputChannel | undefined;

/**
 * Canal «STXT» del panel Output. Es un LogOutputChannel, así que VS Code le pone
 * marca de tiempo y nivel a cada línea y respeta el nivel elegido con el comando
 * «Developer: Set Log Level…». Por defecto ese nivel es Info: lo que se registre
 * con trace() no llega al panel salvo que el usuario lo suba.
 */
export function getLogChannel(): vscode.LogOutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel('STXT', { log: true });
	}
	return channel;
}

/**
 * Registro de la extensión. Regla de uso:
 * - trace: mensajes por pulsación de tecla (análisis, autocompletado).
 * - info: hitos poco frecuentes (carga y recarga de schemas).
 * - warn/error: fallos que no se muestran al usuario de otra forma.
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
