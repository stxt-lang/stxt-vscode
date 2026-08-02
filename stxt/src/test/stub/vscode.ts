import * as fs from 'fs';
import * as path from 'path';

/**
 * Stub del módulo «vscode» para los tests.
 *
 * La capa de editor de esta extensión apenas necesita valores en tiempo de ejecución
 * del API de VS Code (el resto de lo que importa de 'vscode' son tipos, que se borran
 * al compilar). Reimplementarlos aquí permite ejecutar los providers en Node puro,
 * sin arrancar el Electron que exige `@vscode/test-electron`.
 *
 * `register.ts` intercepta `require('vscode')` y devuelve el objeto exportado por
 * defecto de este fichero, así que lo que se añada al objeto `api` del final es lo
 * único que el código de producción puede ver.
 *
 * Regla: este stub imita el comportamiento real de VS Code, incluidos sus errores
 * (ver `TestDocument.lineAt`). Si un test falla por eso, el fallo es del código, no
 * del stub.
 */

export class Position {
	constructor(public readonly line: number, public readonly character: number) { }
}

export class Range {
	readonly start: Position;
	readonly end: Position;

	constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
		this.start = new Position(startLine, startCharacter);
		this.end = new Position(endLine, endCharacter);
	}
}

export class TextEdit {
	private constructor(public readonly range: Range, public readonly newText: string) { }

	static replace(range: Range, newText: string): TextEdit {
		return new TextEdit(range, newText);
	}
}

export enum DiagnosticSeverity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3
}

export class Diagnostic {
	constructor(
		public readonly range: Range,
		public readonly message: string,
		public readonly severity: DiagnosticSeverity = DiagnosticSeverity.Error) { }
}

/** Colección de diagnósticos indexada por URI, como la que devuelve `languages.createDiagnosticCollection`. */
export class DiagnosticCollection {
	private readonly byUri = new Map<string, readonly Diagnostic[]>();

	constructor(public readonly name: string) { }

	set(uri: Uri, diagnostics: readonly Diagnostic[]): void {
		this.byUri.set(uri.toString(), diagnostics);
	}

	get(uri: Uri): readonly Diagnostic[] | undefined {
		return this.byUri.get(uri.toString());
	}

	delete(uri: Uri): void {
		this.byUri.delete(uri.toString());
	}

	clear(): void {
		this.byUri.clear();
	}

	dispose(): void {
		this.clear();
	}
}

export class Uri {
	private constructor(public readonly fsPath: string) { }

	static file(filePath: string): Uri {
		return new Uri(path.resolve(filePath));
	}

	static joinPath(base: Uri, ...segments: string[]): Uri {
		return new Uri(path.join(base.fsPath, ...segments));
	}

	// El inverso de toString(), igual que en el API real.
	static parse(value: string): Uri {
		return new Uri(value.startsWith('file://') ? value.substring('file://'.length) : value);
	}

	get path(): string {
		return this.fsPath;
	}

	toString(): string {
		return `file://${this.fsPath}`;
	}
}

/** Patrón relativo a una carpeta, tal como lo pide `createFileSystemWatcher` fuera del workspace. */
export class RelativePattern {
	readonly baseUri: Uri;

	constructor(base: Uri, public readonly pattern: string) {
		this.baseUri = base;
	}
}

export enum FileType {
	Unknown = 0,
	File = 1,
	Directory = 2,
	SymbolicLink = 64
}

// Solo los valores que usa CompletionProviderSearch, con los números reales del API.
export enum CompletionItemKind {
	Text = 0,
	Module = 8,
	EnumMember = 19
}

export class CompletionItem {
	insertText?: string;
	detail?: string;

	constructor(public readonly label: string, public readonly kind?: CompletionItemKind) { }
}

export class MarkdownString {
	value = '';
	isTrusted = false;

	appendText(text: string): MarkdownString {
		this.value += text;
		return this;
	}

	appendMarkdown(markdown: string): MarkdownString {
		this.value += markdown;
		return this;
	}

	appendCodeblock(code: string, language = ''): MarkdownString {
		this.value += `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
		return this;
	}
}

export class Hover {
	constructor(public readonly contents: MarkdownString | MarkdownString[]) { }
}

export class SemanticTokensLegend {
	constructor(
		public readonly tokenTypes: readonly string[],
		public readonly tokenModifiers: readonly string[] = []) { }
}

export class SemanticTokens {
	constructor(public readonly data: Uint32Array) { }
}

/**
 * Constructor de semantic tokens con la misma codificación relativa que VS Code:
 * cada token son 5 enteros y las posiciones son deltas respecto del token anterior.
 * Al ser deltas sin signo, un `push` fuera de orden corrompe el resultado igual que
 * en el editor real, que es justo lo que interesa comprobar.
 */
export class SemanticTokensBuilder {
	private readonly data: number[] = [];
	private lastLine = 0;
	private lastChar = 0;

	constructor(public readonly legend?: SemanticTokensLegend) { }

	push(line: number, char: number, length: number, tokenType: number, tokenModifiers = 0): void {
		const deltaLine = line - this.lastLine;
		const deltaChar = deltaLine === 0 ? char - this.lastChar : char;

		this.data.push(deltaLine, deltaChar, length, tokenType, tokenModifiers);

		this.lastLine = line;
		this.lastChar = char;
	}

	build(): SemanticTokens {
		return new SemanticTokens(new Uint32Array(this.data));
	}
}

// ****************
// Espacios de nombres del API
// ****************

export interface WorkspaceFolder {
	readonly uri: Uri;
	readonly name: string;
	readonly index: number;
}

interface Disposable {
	dispose(): void;
}

const NOOP_DISPOSABLE: Disposable = { dispose(): void { /* nada que liberar */ } };

const workspaceFs = {
	async readDirectory(uri: Uri): Promise<[string, FileType][]> {
		// readdirSync lanza si el directorio no existe, igual que el API real.
		return fs.readdirSync(uri.fsPath, { withFileTypes: true })
			.map(entry => [entry.name, entry.isDirectory() ? FileType.Directory : FileType.File]);
	},

	async readFile(uri: Uri): Promise<Uint8Array> {
		return fs.readFileSync(uri.fsPath);
	}
};

// Oyentes registrados por la extensión, para poder disparar los eventos desde un test.
const documentListeners = {
	open: [] as ((document: unknown) => unknown)[],
	change: [] as ((event: unknown) => unknown)[],
	close: [] as ((document: unknown) => unknown)[]
};

function subscribe<T>(listeners: ((arg: T) => unknown)[], listener: (arg: T) => unknown): Disposable {
	listeners.push(listener);
	return { dispose: () => { listeners.splice(listeners.indexOf(listener), 1); } };
}

export const workspace = {
	workspaceFolders: [] as WorkspaceFolder[],
	textDocuments: [] as unknown[],
	fs: workspaceFs,

	onDidOpenTextDocument(listener: (document: unknown) => unknown): Disposable {
		return subscribe(documentListeners.open, listener);
	},

	onDidChangeTextDocument(listener: (event: unknown) => unknown): Disposable {
		return subscribe(documentListeners.change, listener);
	},

	onDidCloseTextDocument(listener: (document: unknown) => unknown): Disposable {
		return subscribe(documentListeners.close, listener);
	},

	createFileSystemWatcher(_pattern?: unknown): Disposable & {
		onDidCreate(listener: () => void): Disposable;
		onDidChange(listener: () => void): Disposable;
		onDidDelete(listener: () => void): Disposable;
	} {
		// Los tests cargan los schemas una vez; no hace falta emitir eventos.
		return {
			onDidCreate: () => NOOP_DISPOSABLE,
			onDidChange: () => NOOP_DISPOSABLE,
			onDidDelete: () => NOOP_DISPOSABLE,
			dispose: () => { /* nada que liberar */ }
		};
	}
};

/** Apunta el workspace del stub a un directorio real del disco. */
export function setWorkspaceFolder(folderPath: string): void {
	workspace.workspaceFolders = [{ uri: Uri.file(folderPath), name: path.basename(folderPath), index: 0 }];
}

/** Documentos que el editor ya tiene abiertos, los que ve `activate()` al arrancar. */
export function setOpenDocuments(documents: readonly unknown[]): void {
	workspace.textDocuments = [...documents];
}

/** Dispara `onDidOpenTextDocument`, como al abrir un fichero con la extensión ya activa. */
export async function openDocument(document: unknown): Promise<void> {
	workspace.textDocuments = [...workspace.textDocuments, document];
	await Promise.all(documentListeners.open.map(listener => listener(document)));
}

/** Líneas registradas por el canal de log, para poder afirmar sobre ellas. */
export const logMessages: string[] = [];

export const window = {
	createOutputChannel(name: string) {
		const append = (level: string) => (message: string | Error) => {
			logMessages.push(`[${level}] ${name}: ${String(message)}`);
		};

		return {
			name,
			trace: append('trace'),
			debug: append('debug'),
			info: append('info'),
			warn: append('warn'),
			error: append('error'),
			appendLine: append('line'),
			show: () => { /* sin UI */ },
			dispose: () => { /* nada que liberar */ }
		};
	}
};

let onSemanticTokensProvider: ((provider: unknown) => void) | undefined;

/** Se avisa en cuanto `activate()` registra el provider de semantic tokens. */
export function whenSemanticTokensProviderRegistered(listener: ((provider: unknown) => void) | undefined): void {
	onSemanticTokensProvider = listener;
}

export const languages = {
	createDiagnosticCollection(name: string): DiagnosticCollection {
		return new DiagnosticCollection(name);
	},

	// Los providers se registran en activate() y los tests los invocan directamente:
	// aquí basta con aceptar el registro y devolver algo que se pueda liberar.
	registerDocumentSemanticTokensProvider: (_selector: unknown, provider: unknown) => {
		// VS Code empieza a pedir tokens en cuanto el provider existe, sin esperar a que
		// termine activate(): el enganche deja mirar el editor justo en ese instante.
		onSemanticTokensProvider?.(provider);
		return NOOP_DISPOSABLE;
	},
	registerHoverProvider: () => NOOP_DISPOSABLE,
	registerCompletionItemProvider: () => NOOP_DISPOSABLE,
	registerDocumentFormattingEditProvider: () => NOOP_DISPOSABLE
};

/**
 * Lo que `require('vscode')` devuelve. Se exporta por defecto para que funcionen a la
 * vez las tres formas de importar que usa el código: `import vscode from 'vscode'`,
 * `import * as vscode from 'vscode'` e `import { Range } from 'vscode'`.
 */
const api = {
	Position,
	Range,
	TextEdit,
	Diagnostic,
	DiagnosticSeverity,
	DiagnosticCollection,
	Uri,
	RelativePattern,
	FileType,
	CompletionItem,
	CompletionItemKind,
	MarkdownString,
	Hover,
	SemanticTokens,
	SemanticTokensLegend,
	SemanticTokensBuilder,
	workspace,
	window,
	languages
};

export default api;
