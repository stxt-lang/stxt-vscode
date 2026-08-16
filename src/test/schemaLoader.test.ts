import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import type { DiscoveryEnvironment } from '@stxt-lang/core';
import { setWorkspaceFolder, Uri } from './stub/vscode';
import { asTextDocument, TestDocument } from './stub/TestDocument';
import { registerSchemaLoader, ensureSchemasForDocument, getSchema, getSchemas } from '../extension/SchemaLoader';
import { analyze, describeDiagnostics } from './corpus';

/**
 * Where the loader looks for schemas, and what gets flagged when it finds none.
 *
 * It is the only block that does not use the stxt-web corpus: what is tested is the
 * directory lookup (STXT-DISCOVERY-SPEC), so it needs its own disposable tree instead
 * of real documents.
 *
 * Every registration injects an isolated `DiscoveryEnvironment`: without it, the loader
 * would use the real environment (`STXT_PATH`, `~/.stxt`, `/etc/stxt`) and the result
 * would depend on the machine the tests run on.
 */

const NAMESPACE = 'test.arriba';

const TEMPLATE = [
	'Template (@stxt.template): test.arriba',
	'\tStructure >>',
	'\t\tDocumento (test.arriba):',
	'\t\t\tTitulo: (1)',
	''
].join('\n');

const USER_TEMPLATE = [
	'Template (@stxt.template): test.usuario',
	'\tStructure >>',
	'\t\tNota (test.usuario):',
	'\t\t\tTitulo: (?)',
	''
].join('\n');

// Two versions of the same namespace for the precedence test: the far one requires
// Titulo, the near one makes it optional.
const NESTED_FAR = [
	'Template (@stxt.template): test.anidado',
	'\tStructure >>',
	'\t\tDocumento (test.anidado):',
	'\t\t\tTitulo: (1)',
	''
].join('\n');

const NESTED_NEAR = NESTED_FAR.replace('Titulo: (1)', 'Titulo: (?)');

const DOCUMENT = [
	'Documento (test.arriba):',
	'\tTitulo: Hola',
	''
].join('\n');

// A document of a namespace that no loaded schema declares.
const OTHER_DOCUMENT = [
	'Documento (test.desconocido):',
	'\tTitulo: Hola',
	''
].join('\n');

// A test.anidado document WITHOUT Titulo: it only validates with the near version of the template.
const NESTED_DOCUMENT = [
	'Documento (test.anidado):',
	''
].join('\n');

describe('SchemaLoader', () => {
	let tempRoot: string;
	let projectDir: string;
	let subDir: string;
	let emptyDir: string;
	let documentPath: string;
	let userStxtDir: string;
	let nestedWebDir: string;

	/**
	 * Test tree, reproducing the real case:
	 *
	 *     proyecto/.stxt/test.stxt      ← the template
	 *     proyecto/sub/doc.stxt         ← what gets opened, two levels below
	 *     vacio/                        ← a folder with no .stxt above it
	 *     usuario/.stxt/personal.stxt   ← acts as the user level (injected)
	 *     anidado/.stxt/                ← monorepo: far level…
	 *     anidado/web/.stxt/            ← …and near level of the same namespace
	 */
	before(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stxt-loader-'));
		projectDir = path.join(tempRoot, 'proyecto');
		subDir = path.join(projectDir, 'sub');
		emptyDir = path.join(tempRoot, 'vacio');
		documentPath = path.join(subDir, 'doc.stxt');
		userStxtDir = path.join(tempRoot, 'usuario', '.stxt');
		nestedWebDir = path.join(tempRoot, 'anidado', 'web');

		fs.mkdirSync(path.join(projectDir, '.stxt'), { recursive: true });
		fs.mkdirSync(subDir, { recursive: true });
		fs.mkdirSync(emptyDir, { recursive: true });
		fs.mkdirSync(userStxtDir, { recursive: true });
		fs.mkdirSync(path.join(tempRoot, 'anidado', '.stxt'), { recursive: true });
		fs.mkdirSync(path.join(nestedWebDir, '.stxt'), { recursive: true });

		fs.writeFileSync(path.join(projectDir, '.stxt', 'test.stxt'), TEMPLATE, 'utf-8');
		fs.writeFileSync(documentPath, DOCUMENT, 'utf-8');
		fs.writeFileSync(path.join(userStxtDir, 'personal.stxt'), USER_TEMPLATE, 'utf-8');
		fs.writeFileSync(path.join(tempRoot, 'anidado', '.stxt', 'doc.stxt'), NESTED_FAR, 'utf-8');
		fs.writeFileSync(path.join(nestedWebDir, '.stxt', 'doc.stxt'), NESTED_NEAR, 'utf-8');
	});

	after(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	// Isolated environment: no STXT_PATH, and the user/system levels pointing only at
	// what is given, so that the real environment does not interfere with the tests.
	function isolatedEnvironment(userDir?: string, stxtPath?: string[]): DiscoveryEnvironment {
		return {
			getStxtPath: () => stxtPath === undefined ? null : stxtPath.map(dir => Uri.file(dir).toString()),
			getUserLevelDir: () => userDir === undefined ? null : Uri.file(userDir).toString(),
			getSystemLevelDir: () => null,
		};
	}

	// Activates the loader with the workspace pointing at a specific folder.
	async function register(folder: string, environment: DiscoveryEnvironment = isolatedEnvironment()): Promise<void> {
		setWorkspaceFolder(folder);

		const context = { subscriptions: [] } as unknown as ExtensionContext;
		await registerSchemaLoader(context, async () => { /* no open documents to revalidate */ }, environment);
	}

	describe('where it looks for schemas', () => {

		it('finds the .stxt above the workspace root', async () => {
			// The workspace is the subfolder: the .stxt is one level up.
			await register(subDir);

			assert.ok(getSchema(NAMESPACE), `The ${NAMESPACE} schema was not loaded from ${subDir}.`);
		});

		it('still loads the .stxt of the workspace root itself', async () => {
			await register(projectDir);

			assert.ok(getSchema(NAMESPACE), `The ${NAMESPACE} schema was not loaded from ${projectDir}.`);
		});

		it('loads nothing when there is no .stxt above', async () => {
			await register(emptyDir);

			assert.deepStrictEqual(getSchemas().map(schema => schema.getNamespace()), []);
		});

		it('loads the schemas of a document opened outside the workspace', async () => {
			await register(emptyDir);
			assert.strictEqual(getSchemas().length, 0, 'The empty workspace should bring no schemas.');

			const document = new TestDocument(documentPath, DOCUMENT);
			await ensureSchemasForDocument(asTextDocument(document));

			assert.ok(getSchema(NAMESPACE), `Opening ${documentPath} did not load the ${NAMESPACE} schema.`);
		});
	});

	describe('levels of the chain (STXT-DISCOVERY-SPEC)', () => {

		it('loads the user level in addition to the project level', async () => {
			await register(projectDir, isolatedEnvironment(userStxtDir));

			assert.ok(getSchema(NAMESPACE), 'The project level should still be loaded.');
			assert.ok(getSchema('test.usuario'), 'The user level should contribute its definitions.');
		});

		it('STXT_PATH replaces the whole chain, project level included', async () => {
			await register(projectDir, isolatedEnvironment(undefined, [userStxtDir]));

			assert.ok(getSchema('test.usuario'), 'The STXT_PATH entry should be loaded.');
			assert.ok(!getSchema(NAMESPACE), `With STXT_PATH defined, the project .stxt does not take part.`);
		});

		it('accumulates every ancestor .stxt and validates with the nearest one', async () => {
			// The workspace is anidado/web: its .stxt and the one in anidado/ both define test.anidado.
			await register(nestedWebDir);

			// The document has no Titulo: the near template allows it ((?)), the far one
			// does not ((1)). If it validated with the far one, there would be a cardinality diagnostic.
			const { diagnostics } = analyze(path.join(nestedWebDir, 'fichero.stxt'), NESTED_DOCUMENT);

			assert.strictEqual(diagnostics.length, 0,
				`It should validate against the nearest level:${describeDiagnostics(diagnostics)}`);
		});
	});

	describe('validation when there are no schemas', () => {

		it('flags nothing in a document with a namespace if there is no schema at all', async () => {
			await register(emptyDir);

			// Without the filter there would be one SCHEMA_NOT_FOUND per node, not one per document.
			const { diagnostics } = analyze(documentPath, DOCUMENT);

			assert.strictEqual(diagnostics.length, 0, `No diagnostic was expected:${describeDiagnostics(diagnostics)}`);
		});

		it('still flags syntax errors even without schemas', async () => {
			await register(emptyDir);

			const { diagnostics } = analyze(documentPath, 'Documento (test.arriba):\n\t\t\tTitulo: salto de nivel\n');

			assert.ok(diagnostics.length > 0, 'An indentation jump should still be an error.');
		});

		it('warns about the unknown namespace as soon as some schema is loaded', async () => {
			await register(projectDir);

			const { diagnostics } = analyze(path.join(subDir, 'otro.stxt'), OTHER_DOCUMENT);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('SCHEMA_NOT_FOUND')),
				`A SCHEMA_NOT_FOUND was expected:${describeDiagnostics(diagnostics)}`);
		});

		it('flags nothing in a document that does validate against its schema', async () => {
			await register(projectDir);

			const { diagnostics } = analyze(documentPath, DOCUMENT);

			assert.strictEqual(diagnostics.length, 0, `No diagnostic was expected:${describeDiagnostics(diagnostics)}`);
		});
	});
});
