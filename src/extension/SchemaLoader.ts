import vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import {
	DiscoveryDefinition,
	DiscoveryEntry,
	DiscoveryEnvironment,
	DiscoveryFileSystem,
	DiscoveryResolver,
	DiscoveryResult,
	Schema,
	SchemaProvider,
	StringUtils,
	UnifiedSchemaProvider,
} from '@stxt-lang/core';
import { log } from './Log';

/**
 * Schema/template resolution according to STXT-DISCOVERY-SPEC (stxt-lang,
 * `stxt-discovery-ref.stxt`): the normative logic lives in `DiscoveryResolver`
 * (@stxt-lang/core) and only the two editor adapters remain here —
 * `vscode.workspace.fs` and the process environment— plus the per-document state.
 *
 * The chain of each document (every ancestor `.stxt/`, user level, system level,
 * or `STXT_PATH`) is resolved by its directory and cached per directory; the loaded
 * levels are shared between documents through the resolver's own cache, which is
 * the optimization the spec allows.
 */

const STXT_DIR = '.stxt';
const STXT_FILES_GLOB = `**/${STXT_DIR}/**/*.stxt`;
const SCHEMA_DIR_GLOB = '**/*.stxt';

// **********
// ADAPTERS
// **********

/**
 * `DiscoveryFileSystem` adapter over `vscode.workspace.fs`.
 *
 * The paths the resolver sees are `Uri.toString()`; the adapter remembers the `Uri`
 * of every path it produces, so it never has to rebuild it with `Uri.parse` and it
 * works with any URI scheme (file, remote, virtual). The `Uri.parse` in `uriOf()` is
 * only for paths it did not produce itself, which come from an injected environment.
 */
class VscodeDiscoveryFileSystem implements DiscoveryFileSystem {
	private readonly uris = new Map<string, vscode.Uri>();

	/** Registers a Uri and returns the path (its textual form) the resolver will see. */
	track(uri: vscode.Uri): string {
		const key = uri.toString();
		this.uris.set(key, uri);
		return key;
	}

	/** The Uri of a path produced by this adapter (or, if it comes from outside, parsed from its text). */
	uriOf(pathKey: string): vscode.Uri {
		let uri = this.uris.get(pathKey);

		if (!uri) {
			// Paths are born in track/join/parentOf, but an injected environment (tests,
			// configuration) may contribute its own: those are recovered from their text.
			uri = vscode.Uri.parse(pathKey);
			this.uris.set(pathKey, uri);
		}

		return uri;
	}

	async isDirectory(pathKey: string): Promise<boolean> {
		try {
			await vscode.workspace.fs.readDirectory(this.uriOf(pathKey));
			return true;
		} catch {
			// The usual case is that the directory does not exist: not an error.
			return false;
		}
	}

	async listDirectory(pathKey: string): Promise<DiscoveryEntry[]> {
		const base = this.uriOf(pathKey);
		const entries = await vscode.workspace.fs.readDirectory(base);

		// Never follow a symbolic link in a resolution directory (STXT-DISCOVERY-SPEC sections
		// 3 and 10): a directory link could loop the descent, a file link could read a file from
		// outside the .stxt/. A symlink has the SymbolicLink bit set in its FileType; filter
		// those out so both directory and file links are omitted.
		return entries
			.filter(([, type]) => (type & vscode.FileType.SymbolicLink) === 0)
			.map(([name, type]) => ({
				path: this.track(vscode.Uri.joinPath(base, name)),
				name,
				isDirectory: type === vscode.FileType.Directory,
			}));
	}

	async readFile(pathKey: string): Promise<string> {
		const bytes = await vscode.workspace.fs.readFile(this.uriOf(pathKey));
		// Strict decode (STXT-SPEC 3): a definition that is not valid UTF-8 is a read error,
		// never silently decoded with U+FFFD replacement characters.
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	}

	parentOf(pathKey: string): string | null {
		const parent = vscode.Uri.joinPath(this.uriOf(pathKey), '..');
		const parentKey = parent.toString();

		// The file system root is its own parent.
		if (parentKey === pathKey) {
			return null;
		}

		return this.track(parent);
	}

	join(pathKey: string, name: string): string {
		return this.track(vscode.Uri.joinPath(this.uriOf(pathKey), name));
	}
}

/**
 * `DiscoveryEnvironment` adapter over the process environment: `STXT_PATH`,
 * `$HOME/.stxt` and `/etc/stxt` (`%USERPROFILE%\.stxt` and `%ProgramData%\stxt` on
 * Windows). In a remote workspace the extension host runs on the remote machine,
 * so these values are the right ones there too.
 */
class VscodeDiscoveryEnvironment implements DiscoveryEnvironment {
	constructor(private readonly fileSystem: VscodeDiscoveryFileSystem) {}

	getStxtPath(): string[] | null {
		const value = process.env['STXT_PATH'];

		if (value === undefined) {
			return null;
		}

		return value.split(path.delimiter)
			.filter(entry => entry !== '')
			.map(entry => this.fileSystem.track(vscode.Uri.file(entry)));
	}

	getUserLevelDir(): string | null {
		const home = os.homedir();
		return home ? this.fileSystem.track(vscode.Uri.file(path.join(home, STXT_DIR))) : null;
	}

	getSystemLevelDir(): string | null {
		if (process.platform === 'win32') {
			const programData = process.env['ProgramData'];
			return programData ? this.fileSystem.track(vscode.Uri.file(path.join(programData, 'stxt'))) : null;
		}

		return this.fileSystem.track(vscode.Uri.file('/etc/stxt'));
	}
}

// **********
// STATE
// **********

let fileSystem = new VscodeDiscoveryFileSystem();
let resolver: DiscoveryResolver | undefined;

/** Resolution results by starting directory (the document's, or a workspace folder). */
const RESULTS = new Map<string, DiscoveryResult>();

/** Resolution directories (levels) already discovered, for watchers and to detect new ones. */
const KNOWN_LEVEL_DIRS = new Set<string>();

/** Directories that already have their own watcher, so they are not duplicated. */
const WATCHED_DIRS = new Set<string>();

/** Serves the `@stxt.schema`/`@stxt.template` meta-schemas while there is no result yet. */
const META_FALLBACK = new UnifiedSchemaProvider();

let extensionContext: vscode.ExtensionContext | undefined;
let notifySchemasChanged: () => void | Promise<void> = () => { /* not registered yet */ };

/**
 * The `SchemaProvider` the validator sees. With a document Uri it resolves against
 * that document's chain (STXT-DISCOVERY-SPEC section 7); without one, against the
 * union of everything resolved, which is the behaviour for consumers without a document.
 */
export class SchemaLoaderExtension implements SchemaProvider {
	constructor(private readonly documentUri?: vscode.Uri) {}

	getSchema(namespace: string): Schema | null | undefined {
		if (this.documentUri) {
			return getSchemaForDocument(this.documentUri, namespace);
		}

		return getSchema(namespace);
	}
}

/** The resolution result that corresponds to a document, if its directory was already resolved. */
function resultForDocument(documentUri: vscode.Uri): DiscoveryResult | undefined {
	return RESULTS.get(vscode.Uri.joinPath(documentUri, '..').toString());
}

/**
 * Resolves a namespace against the document's chain; if the document's directory is
 * not resolved yet, falls back to the global union.
 */
export function getSchemaForDocument(documentUri: vscode.Uri, namespace: string): Schema | null | undefined {
	const result = resultForDocument(documentUri);

	if (result) {
		const schema = result.getSchema(namespace);

		if (schema) {
			return schema;
		}
	}

	return getSchema(namespace);
}

/** The active schemas for a document; if its directory is not resolved, the global union. */
export function getSchemasForDocument(documentUri: vscode.Uri): ReadonlyArray<Schema> {
	const result = resultForDocument(documentUri);
	return result ? result.getAllSchemas() : getSchemas();
}

/** Resolves a namespace against the union of all results (first one that has it wins). */
export function getSchema(namespace: string): Schema | undefined | null {
	for (const result of RESULTS.values()) {
		const schema = result.getSchema(namespace);

		if (schema) {
			return schema;
		}
	}

	// Even without results, the meta-schemas of the reserved namespaces must be served.
	return META_FALLBACK.getSchema(namespace);
}

/** Where the active definition of a namespace lives: the file, as the editor can open it, and its provenance. */
export interface DefinitionLocation {
	/** The definition file (schema or template), as a Uri the editor can open. */
	readonly uri: vscode.Uri;
	/** The active definition, with the namespace, compiled schema and level directory. */
	readonly definition: DiscoveryDefinition;
}

/**
 * Locates the definition of a namespace for a document, following the same rule as
 * `getSchemaForDocument`: the document's chain first, then the global union. The reserved
 * namespaces (`@stxt.schema`, `@stxt.template`) have no file: their meta-schemas are built in.
 *
 * @param documentUri the document the namespace is used in.
 * @param namespace the namespace whose definition file is wanted.
 * @returns the definition and its file, or undefined if no loaded level defines the namespace.
 */
export function getDefinitionForDocument(documentUri: vscode.Uri, namespace: string): DefinitionLocation | undefined {
	const own = resultForDocument(documentUri);
	const results = own ? [own, ...RESULTS.values()] : [...RESULTS.values()];

	for (const result of results) {
		const definition = result.getDefinition(namespace);

		if (definition) {
			return { uri: fileSystem.uriOf(definition.file), definition };
		}
	}

	return undefined;
}

/** Every known active schema, one per namespace (the first result that defines it wins). */
export function getSchemas(): ReadonlyArray<Schema> {
	const seen = new Set<string>();
	const result: Schema[] = [];

	for (const discovery of RESULTS.values()) {
		for (const definition of discovery.getActiveDefinitions()) {
			const key = StringUtils.lowerCase(definition.namespace);

			if (!seen.has(key)) {
				seen.add(key);
				result.push(definition.schema);
			}
		}
	}

	return result;
}

// ****************
// Register loaders
// ****************

export async function registerSchemaLoader(
	context: vscode.ExtensionContext,
	onSchemasChanged: () => void | Promise<void>,
	environment?: DiscoveryEnvironment,
): Promise<void> {
	extensionContext = context;
	notifySchemasChanged = onSchemasChanged;

	// Registering means starting from scratch: in the editor it happens once, on activation.
	// The `environment` parameter exists for the tests, which inject an isolated environment
	// (no STXT_PATH and no real user/system levels).
	fileSystem = new VscodeDiscoveryFileSystem();
	resolver = new DiscoveryResolver(fileSystem, environment ?? new VscodeDiscoveryEnvironment(fileSystem));
	RESULTS.clear();
	KNOWN_LEVEL_DIRS.clear();
	WATCHED_DIRS.clear();

	// Watcher for any .stxt file inside a .stxt directory of the workspace
	watchPattern(STXT_FILES_GLOB);

	// Initial starting points: the workspace folders and the documents already open.
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		log.trace(`Workspace folder: ${folder.uri.toString()}`);
		await resolveLocation(folder.uri);
	}

	for (const document of vscode.workspace.textDocuments) {
		await resolveLocationForDocument(document);
	}

	await notifySchemasChanged();

	if (getSchemas().length === 0) {
		log.info(`No schemas loaded: the resolution chain provides no definition. Namespaced documents will report SCHEMA_NOT_FOUND (unless stxt.schemaValidation is off).`);
	} else {
		log.info(`Initial load: ${getSchemas().length} schemas, ${KNOWN_LEVEL_DIRS.size} resolution directories.`);
	}
}

/**
 * Resolves a document's chain before analyzing it.
 *
 * This is what rescues the common case of opening a loose `.stxt`, or a subfolder of a
 * project, when the `.stxt/` sits above the workspace root: without it no schema would
 * be loaded.
 *
 * @param document the document that has just been opened.
 */
export async function ensureSchemasForDocument(document: vscode.TextDocument): Promise<void> {
	if (await resolveLocationForDocument(document)) {
		log.info(`New resolution directories for ${document.uri.toString()}: revalidating.`);
		await notifySchemasChanged();
	}
}

// The document's directory is the starting point of its resolution chain.
async function resolveLocationForDocument(document: vscode.TextDocument): Promise<boolean> {
	if (document.languageId !== 'stxt' || document.isUntitled) {
		// A document without a location has no project level (STXT-DISCOVERY-SPEC 4.1);
		// its user/system levels are already covered by the initial load.
		return false;
	}

	return resolveLocation(vscode.Uri.joinPath(document.uri, '..'));
}

/**
 * Resolves a directory's chain and stores the result. Watches the resolution
 * directories it did not know about.
 *
 * @param dirUri the starting directory (the document's, or a workspace folder).
 * @returns true if any new resolution directory was discovered.
 */
async function resolveLocation(dirUri: vscode.Uri): Promise<boolean> {
	if (!resolver) {
		return false;
	}

	const key = fileSystem.track(dirUri);
	const result = await resolver.resolve(key);
	RESULTS.set(key, result);

	let discovered = false;

	for (const levelDir of result.getChain()) {
		if (!KNOWN_LEVEL_DIRS.has(levelDir)) {
			KNOWN_LEVEL_DIRS.add(levelDir);
			watchSchemaDir(levelDir);
			log.info(`Resolution directory found: ${levelDir}`);
			discovered = true;
		}
	}

	if (discovered) {
		// Resolution errors (STXT-DISCOVERY-SPEC section 8) are reported to the log,
		// once per discovery so they are not repeated on every resolve.
		for (const error of result.getErrors()) {
			log.error(`[${error.code}] ${error.message}`);
		}
	}

	return discovered;
}

// A change on disk invalidates the loaded levels: everything known is re-resolved.
async function reloadAllSchemaData(reason: string): Promise<void> {
	if (!resolver) {
		return;
	}

	try {
		log.info(`Reloading schemas (${reason})...`);
		resolver.clearCache();

		for (const key of RESULTS.keys()) {
			const result = await resolver.resolve(key);
			RESULTS.set(key, result);

			for (const levelDir of result.getChain()) {
				if (!KNOWN_LEVEL_DIRS.has(levelDir)) {
					KNOWN_LEVEL_DIRS.add(levelDir);
					watchSchemaDir(levelDir);
				}
			}
		}

		await notifySchemasChanged();
		log.info(`Schemas reloaded (${reason}): ${getSchemas().length}.`);
	} catch (e) {
		log.error(`Error reloading schemas (${reason}): ${String(e)}`);
	}
}

// *********
// WATCHERS
// *********

// A resolution directory outside the workspace is not covered by the global watcher, so it gets its own.
function watchSchemaDir(levelDirKey: string): void {
	if (!WATCHED_DIRS.has(levelDirKey)) {
		WATCHED_DIRS.add(levelDirKey);
		watchPattern(new vscode.RelativePattern(fileSystem.uriOf(levelDirKey), SCHEMA_DIR_GLOB));
	}
}

function watchPattern(pattern: vscode.GlobPattern): void {
	if (!extensionContext) {
		return;
	}

	const watcher = vscode.workspace.createFileSystemWatcher(pattern);

	extensionContext.subscriptions.push(
		watcher,
		watcher.onDidCreate(() => reloadAllSchemaData('file created')),
		watcher.onDidChange(() => reloadAllSchemaData('file changed')),
		watcher.onDidDelete(() => reloadAllSchemaData('file deleted')),
	);
}
