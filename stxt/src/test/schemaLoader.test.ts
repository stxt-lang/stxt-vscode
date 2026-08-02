import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { setWorkspaceFolder } from './stub/vscode';
import { asTextDocument, TestDocument } from './stub/TestDocument';
import { registerSchemaLoader, ensureSchemasForDocument, getSchema, getSchemas } from '../extension/SchemaLoader';
import { analyze, describeDiagnostics } from './corpus';

/**
 * Dónde busca los schemas el cargador, y qué se marca cuando no encuentra ninguno.
 *
 * Es el único bloque que no usa el corpus de stxt-web: lo que se prueba es la búsqueda de
 * directorios, así que necesita un árbol propio y desechable en vez de documentos reales.
 */

const NAMESPACE = 'test.arriba';

const TEMPLATE = [
	'Template (@stxt.template): test.arriba',
	'\tStructure >>',
	'\t\tDocumento (test.arriba):',
	'\t\t\tTitulo: (1)',
	''
].join('\n');

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

describe('SchemaLoader', () => {
	let tempRoot: string;
	let projectDir: string;
	let subDir: string;
	let emptyDir: string;
	let documentPath: string;

	/**
	 * Árbol de prueba, que reproduce el caso real:
	 *
	 *     proyecto/.stxt/test.stxt   ← el template
	 *     proyecto/sub/doc.stxt      ← lo que se abre, dos niveles por debajo
	 *     vacio/                     ← una carpeta sin ningún .stxt por encima
	 */
	before(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stxt-loader-'));
		projectDir = path.join(tempRoot, 'proyecto');
		subDir = path.join(projectDir, 'sub');
		emptyDir = path.join(tempRoot, 'vacio');
		documentPath = path.join(subDir, 'doc.stxt');

		fs.mkdirSync(path.join(projectDir, '.stxt'), { recursive: true });
		fs.mkdirSync(subDir, { recursive: true });
		fs.mkdirSync(emptyDir, { recursive: true });

		fs.writeFileSync(path.join(projectDir, '.stxt', 'test.stxt'), TEMPLATE, 'utf-8');
		fs.writeFileSync(documentPath, DOCUMENT, 'utf-8');
	});

	after(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	// Activa el cargador con el workspace apuntando a una carpeta concreta.
	async function register(folder: string): Promise<void> {
		setWorkspaceFolder(folder);

		const context = { subscriptions: [] } as unknown as ExtensionContext;
		await registerSchemaLoader(context, async () => { /* sin documentos abiertos que revalidar */ });
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
