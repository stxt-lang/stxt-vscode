import * as fs from 'fs';
import * as path from 'path';

/**
 * Stub of the "vscode" module for the tests.
 *
 * The editor layer of this extension barely needs runtime values from the VS Code API
 * (everything else it imports from 'vscode' are types, erased at compile time).
 * Reimplementing them here lets the providers run in plain Node, without starting the
 * Electron that `@vscode/test-electron` requires.
 *
 * `register.ts` intercepts `require('vscode')` and returns the default export of this
 * file, so whatever is added to the `api` object at the end is the only thing the
 * production code can see.
 *
 * Rule: this stub mimics the real behaviour of VS Code, its errors included (see
 * `TestDocument.lineAt`). If a test fails because of that, the fault is in the code,
 * not in the stub.
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

/** Diagnostic collection indexed by URI, like the one `languages.createDiagnosticCollection` returns. */
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

	// The inverse of toString(), just like in the real API.
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

/** Pattern relative to a folder, as `createFileSystemWatcher` requires outside the workspace. */
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

// Only the values CompletionProviderSearch uses, with the real API numbers.
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

/** Target of "go to definition": a file and a position (or range) inside it, as in the real API. */
export class Location {
	readonly range: Range;

	constructor(public readonly uri: Uri, rangeOrPosition: Range | Position) {
		this.range = rangeOrPosition instanceof Range
			? rangeOrPosition
			: new Range(rangeOrPosition.line, rangeOrPosition.character, rangeOrPosition.line, rangeOrPosition.character);
	}
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
 * Semantic tokens builder with the same relative encoding as VS Code: every token is
 * 5 integers and the positions are deltas from the previous token. Since the deltas
 * are unsigned, an out-of-order `push` corrupts the result just like in the real
 * editor, which is exactly what is worth checking.
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
// API namespaces
// ****************

export interface WorkspaceFolder {
	readonly uri: Uri;
	readonly name: string;
	readonly index: number;
}

interface Disposable {
	dispose(): void;
}

const NOOP_DISPOSABLE: Disposable = { dispose(): void { /* nothing to release */ } };

const workspaceFs = {
	async readDirectory(uri: Uri): Promise<[string, FileType][]> {
		// readdirSync throws if the directory does not exist, just like the real API.
		return fs.readdirSync(uri.fsPath, { withFileTypes: true })
			.map(entry => [entry.name, entry.isDirectory() ? FileType.Directory : FileType.File]);
	},

	async readFile(uri: Uri): Promise<Uint8Array> {
		return fs.readFileSync(uri.fsPath);
	}
};

// Listeners registered by the extension, so the events can be fired from a test.
const documentListeners = {
	open: [] as ((document: unknown) => unknown)[],
	change: [] as ((event: unknown) => unknown)[],
	close: [] as ((document: unknown) => unknown)[]
};

function subscribe<T>(listeners: ((arg: T) => unknown)[], listener: (arg: T) => unknown): Disposable {
	listeners.push(listener);
	return { dispose: () => { listeners.splice(listeners.indexOf(listener), 1); } };
}

/** Settings the stub `getConfiguration` answers with, by full key (`section.key`). */
const configurationValues = new Map<string, unknown>();

/** Sets a setting for the tests, e.g. `setConfiguration('stxt.developerMode', true)`; `undefined` clears it. */
export function setConfiguration(fullKey: string, value: unknown): void {
	if (value === undefined) {
		configurationValues.delete(fullKey);
	} else {
		configurationValues.set(fullKey, value);
	}
}

export const workspace = {
	workspaceFolders: [] as WorkspaceFolder[],
	textDocuments: [] as unknown[],
	fs: workspaceFs,

	/** Like the real one for what the extension uses: `get(key, default)` under a section; the scope is ignored. */
	getConfiguration(section?: string, _scope?: unknown): { get<T>(key: string, defaultValue: T): T } {
		return {
			get<T>(key: string, defaultValue: T): T {
				const fullKey = section ? `${section}.${key}` : key;
				return configurationValues.has(fullKey) ? configurationValues.get(fullKey) as T : defaultValue;
			}
		};
	},

	onDidOpenTextDocument(listener: (document: unknown) => unknown): Disposable {
		return subscribe(documentListeners.open, listener);
	},

	onDidChangeTextDocument(listener: (event: unknown) => unknown): Disposable {
		return subscribe(documentListeners.change, listener);
	},

	onDidCloseTextDocument(listener: (document: unknown) => unknown): Disposable {
		return subscribe(documentListeners.close, listener);
	},

	onDidChangeConfiguration(_listener: (event: unknown) => unknown): Disposable {
		return { dispose() { /* the tests set configuration directly */ } };
	},

	createFileSystemWatcher(_pattern?: unknown): Disposable & {
		onDidCreate(listener: () => void): Disposable;
		onDidChange(listener: () => void): Disposable;
		onDidDelete(listener: () => void): Disposable;
	} {
		// The tests load the schemas once; no need to emit events.
		return {
			onDidCreate: () => NOOP_DISPOSABLE,
			onDidChange: () => NOOP_DISPOSABLE,
			onDidDelete: () => NOOP_DISPOSABLE,
			dispose: () => { /* nothing to release */ }
		};
	}
};

/** Points the stub workspace at a real directory on disk. */
export function setWorkspaceFolder(folderPath: string): void {
	workspace.workspaceFolders = [{ uri: Uri.file(folderPath), name: path.basename(folderPath), index: 0 }];
}

/** Documents the editor already has open, the ones `activate()` sees at startup. */
export function setOpenDocuments(documents: readonly unknown[]): void {
	workspace.textDocuments = [...documents];
}

/** Fires `onDidOpenTextDocument`, as when opening a file with the extension already active. */
export async function openDocument(document: unknown): Promise<void> {
	workspace.textDocuments = [...workspace.textDocuments, document];
	await Promise.all(documentListeners.open.map(listener => listener(document)));
}

/** Lines recorded by the log channel, so they can be asserted on. */
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
			show: () => { /* no UI */ },
			dispose: () => { /* nothing to release */ }
		};
	}
};

let onSemanticTokensProvider: ((provider: unknown) => void) | undefined;

/** Notified as soon as `activate()` registers the semantic tokens provider. */
export function whenSemanticTokensProviderRegistered(listener: ((provider: unknown) => void) | undefined): void {
	onSemanticTokensProvider = listener;
}

export const languages = {
	createDiagnosticCollection(name: string): DiagnosticCollection {
		return new DiagnosticCollection(name);
	},

	// The providers are registered in activate() and the tests invoke them directly:
	// here it is enough to accept the registration and return something disposable.
	registerDocumentSemanticTokensProvider: (_selector: unknown, provider: unknown) => {
		// VS Code starts asking for tokens as soon as the provider exists, without waiting
		// for activate() to finish: the hook lets the editor be inspected at that very instant.
		onSemanticTokensProvider?.(provider);
		return NOOP_DISPOSABLE;
	},
	registerHoverProvider: () => NOOP_DISPOSABLE,
	registerCompletionItemProvider: () => NOOP_DISPOSABLE,
	registerDocumentFormattingEditProvider: () => NOOP_DISPOSABLE,
	registerDefinitionProvider: () => NOOP_DISPOSABLE
};

/**
 * What `require('vscode')` returns. Exported as default so that the three import forms
 * the code uses all work at once: `import vscode from 'vscode'`,
 * `import * as vscode from 'vscode'` and `import { Range } from 'vscode'`.
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
	Location,
	SemanticTokens,
	SemanticTokensLegend,
	SemanticTokensBuilder,
	workspace,
	window,
	languages
};

export default api;
