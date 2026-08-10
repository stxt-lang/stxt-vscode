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
 * Dónde busca los schemas el cargador, y qué se marca cuando no encuentra ninguno.
 *
 * Es el único bloque que no usa el corpus de stxt-web: lo que se prueba es la búsqueda de
 * directorios (STXT-DISCOVERY-SPEC), así que necesita un árbol propio y desechable en vez
 * de documentos reales.
 *
 * Todos los registros inyectan un `DiscoveryEnvironment` aislado: sin él, el cargador
 * usaría el entorno real (`STXT_PATH`, `~/.stxt`, `/etc/stxt`) y el resultado dependería
 * de la máquina donde corran los tests.
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

// Dos versiones del mismo namespace para el test de precedencia: la lejana exige Titulo,
// la cercana lo hace opcional.
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

// Un documento de un namespace que no declara ningún schema cargado.
const OTHER_DOCUMENT = [
	'Documento (test.desconocido):',
	'\tTitulo: Hola',
	''
].join('\n');

// Un documento de test.anidado SIN Titulo: solo valida con la versión cercana del template.
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
	 * Árbol de prueba, que reproduce el caso real:
	 *
	 *     proyecto/.stxt/test.stxt      ← el template
	 *     proyecto/sub/doc.stxt         ← lo que se abre, dos niveles por debajo
	 *     vacio/                        ← una carpeta sin ningún .stxt por encima
	 *     usuario/.stxt/personal.stxt   ← hace de nivel de usuario (inyectado)
	 *     anidado/.stxt/                ← monorepo: nivel lejano…
	 *     anidado/web/.stxt/            ← …y nivel cercano del mismo namespace
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

	// Entorno aislado: sin STXT_PATH y con los niveles de usuario/sistema apuntando solo
	// a lo que se le indique, para que el entorno real no interfiera en los tests.
	function isolatedEnvironment(userDir?: string, stxtPath?: string[]): DiscoveryEnvironment {
		return {
			getStxtPath: () => stxtPath === undefined ? null : stxtPath.map(dir => Uri.file(dir).toString()),
			getUserLevelDir: () => userDir === undefined ? null : Uri.file(userDir).toString(),
			getSystemLevelDir: () => null,
		};
	}

	// Activa el cargador con el workspace apuntando a una carpeta concreta.
	async function register(folder: string, environment: DiscoveryEnvironment = isolatedEnvironment()): Promise<void> {
		setWorkspaceFolder(folder);

		const context = { subscriptions: [] } as unknown as ExtensionContext;
		await registerSchemaLoader(context, async () => { /* sin documentos abiertos que revalidar */ }, environment);
	}

	describe('dónde busca los schemas', () => {

		it('encuentra el .stxt que está por encima de la raíz del workspace', async () => {
			// El workspace es la subcarpeta: el .stxt está un nivel más arriba.
			await register(subDir);

			assert.ok(getSchema(NAMESPACE), `No se ha cargado el schema de ${NAMESPACE} desde ${subDir}.`);
		});

		it('sigue cargando el .stxt de la propia raíz del workspace', async () => {
			await register(projectDir);

			assert.ok(getSchema(NAMESPACE), `No se ha cargado el schema de ${NAMESPACE} desde ${projectDir}.`);
		});

		it('no carga nada cuando no hay ningún .stxt por encima', async () => {
			await register(emptyDir);

			assert.deepStrictEqual(getSchemas().map(schema => schema.getNamespace()), []);
		});

		it('carga los schemas de un documento que se abre fuera del workspace', async () => {
			await register(emptyDir);
			assert.strictEqual(getSchemas().length, 0, 'El workspace vacío no debería traer schemas.');

			const document = new TestDocument(documentPath, DOCUMENT);
			await ensureSchemasForDocument(asTextDocument(document));

			assert.ok(getSchema(NAMESPACE), `Abrir ${documentPath} no ha cargado el schema de ${NAMESPACE}.`);
		});
	});

	describe('niveles de la cadena (STXT-DISCOVERY-SPEC)', () => {

		it('carga el nivel de usuario además del nivel de proyecto', async () => {
			await register(projectDir, isolatedEnvironment(userStxtDir));

			assert.ok(getSchema(NAMESPACE), 'El nivel de proyecto debería seguir cargándose.');
			assert.ok(getSchema('test.usuario'), 'El nivel de usuario debería aportar sus definiciones.');
		});

		it('STXT_PATH sustituye la cadena completa, incluido el nivel de proyecto', async () => {
			await register(projectDir, isolatedEnvironment(undefined, [userStxtDir]));

			assert.ok(getSchema('test.usuario'), 'La entrada de STXT_PATH debería cargarse.');
			assert.ok(!getSchema(NAMESPACE), `Con STXT_PATH definido, el .stxt del proyecto no participa.`);
		});

		it('acumula todos los .stxt ascendentes y valida con el más cercano', async () => {
			// El workspace es anidado/web: su .stxt y el de anidado/ definen test.anidado.
			await register(nestedWebDir);

			// El documento no tiene Titulo: el template cercano lo permite ((?)), el lejano
			// no ((1)). Si validara con el lejano, habría un diagnóstico de cardinalidad.
			const { diagnostics } = analyze(path.join(nestedWebDir, 'fichero.stxt'), NESTED_DOCUMENT);

			assert.strictEqual(diagnostics.length, 0,
				`Debería validar contra el nivel más cercano:${describeDiagnostics(diagnostics)}`);
		});
	});

	describe('validación cuando no hay schemas', () => {

		it('no marca nada en un documento con namespace si no hay ningún schema', async () => {
			await register(emptyDir);

			// Sin el filtro habría un SCHEMA_NOT_FOUND por nodo, no uno por documento.
			const { diagnostics } = analyze(documentPath, DOCUMENT);

			assert.strictEqual(diagnostics.length, 0, `Se esperaba ningún diagnóstico:${describeDiagnostics(diagnostics)}`);
		});

		it('sigue marcando los errores de sintaxis aunque no haya schemas', async () => {
			await register(emptyDir);

			const { diagnostics } = analyze(documentPath, 'Documento (test.arriba):\n\t\t\tTitulo: salto de nivel\n');

			assert.ok(diagnostics.length > 0, 'Un salto de indentación debería seguir siendo un error.');
		});

		it('avisa del namespace desconocido en cuanto hay algún schema cargado', async () => {
			await register(projectDir);

			const { diagnostics } = analyze(path.join(subDir, 'otro.stxt'), OTHER_DOCUMENT);

			assert.ok(
				diagnostics.some(diagnostic => diagnostic.message.includes('SCHEMA_NOT_FOUND')),
				`Se esperaba un SCHEMA_NOT_FOUND:${describeDiagnostics(diagnostics)}`);
		});

		it('no marca nada en un documento que sí valida contra su schema', async () => {
			await register(projectDir);

			const { diagnostics } = analyze(documentPath, DOCUMENT);

			assert.strictEqual(diagnostics.length, 0, `Se esperaba ningún diagnóstico:${describeDiagnostics(diagnostics)}`);
		});
	});
});
