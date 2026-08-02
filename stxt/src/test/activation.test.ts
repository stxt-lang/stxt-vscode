import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExtensionContext, SemanticTokens, TextDocument } from 'vscode';
import { setWorkspaceFolder, setOpenDocuments, openDocument, logMessages, whenSemanticTokensProviderRegistered } from './stub/vscode';
import { asTextDocument, TestDocument } from './stub/TestDocument';
import { activate } from '../extension';
import { StxtSemanticTokensProvider } from '../extension/SemanticTokensProvider';

/**
 * Que un documento tenga color **desde el primer momento**.
 *
 * Los providers leen el análisis del caché de `AnalysisDoc`, así que todo depende de que
 * el documento esté analizado cuando VS Code pide los tokens, que es nada más pintarlo.
 * Cuando no lo está, el editor recibe una lista vacía y el fichero se queda en blanco y
 * negro hasta que se toca —el editor no vuelve a preguntar por su cuenta—. Aquí se cubren
 * los tres caminos por los que un documento llega al provider.
 */

const TOKENS = new StxtSemanticTokensProvider();

// Sin namespace a propósito: lo que se mira es el color, no la validación.
const DOCUMENT = [
	'Documento:',
	'\tTitulo: Hola',
	'\tCuerpo >>',
	'\t\tuna línea',
	''
].join('\n');

interface TokensProvider {
	provideDocumentSemanticTokens(document: TextDocument): SemanticTokens;
}

// Cuántos enteros de semantic tokens devuelve un provider para el documento: 0 es «sin color».
function tokensOf(provider: unknown, document: TestDocument): number {
	return (provider as TokensProvider).provideDocumentSemanticTokens(asTextDocument(document)).data.length;
}

function tokenCount(document: TestDocument): number {
	return tokensOf(TOKENS, document);
}

/**
 * Si el provider ha tenido que analizar él mismo, `getAnalysis` lo deja dicho en el log.
 * Es la única forma de distinguir «el documento ya estaba analizado» de «lo ha salvado la
 * red de seguridad», porque por fuera las dos devuelven los mismos tokens.
 */
function analyzedOnTheSpot(document: TestDocument, from: number): boolean {
	return logMessages.slice(from).some(message => message.includes('en frío') && message.includes(document.uri.toString()));
}

describe('activate: el documento tiene color desde el primer momento', () => {
	let tempRoot: string;

	before(async () => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stxt-activate-'));
		setWorkspaceFolder(tempRoot);
	});

	after(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	it('analiza los documentos que ya estaban abiertos antes de registrar los providers', async () => {
		// Un documento abierto antes de que arranque la extensión nunca recibe
		// onDidOpenTextDocument: si activate() no lo analiza, no lo hace nadie. Y hay que
		// analizarlo antes de registrar el provider, porque la carga de schemas que viene
		// después es asíncrona y el editor no espera a que termine.
		const document = new TestDocument(path.join(tempRoot, 'abierto.stxt'), DOCUMENT);
		setOpenDocuments([asTextDocument(document)]);

		let tokensAtRegistration = -1;
		let coldAtRegistration = true;

		whenSemanticTokensProviderRegistered(provider => {
			const from = logMessages.length;
			tokensAtRegistration = tokensOf(provider, document);
			coldAtRegistration = analyzedOnTheSpot(document, from);
		});

		try {
			await activate({ subscriptions: [] } as unknown as ExtensionContext);
		} finally {
			whenSemanticTokensProviderRegistered(undefined);
		}

		assert.ok(tokensAtRegistration > 0, 'El documento ya abierto no tenía tokens al registrarse el provider.');
		assert.ok(!coldAtRegistration, 'Debería quedar analizado en activate(), sin recurrir a la red de seguridad.');
	});

	it('analiza un documento que se abre con la extensión ya activa', async () => {
		const document = new TestDocument(path.join(tempRoot, 'nuevo.stxt'), DOCUMENT);

		// Sin await a propósito: VS Code tampoco espera a que termine el oyente, así que
		// esto es lo que el editor ve al pintar, con la parte síncrona del handler hecha
		// y la búsqueda de schemas todavía en marcha.
		const pending = openDocument(asTextDocument(document));
		const from = logMessages.length;

		assert.ok(tokenCount(document) > 0, 'El documento recién abierto se ha quedado sin tokens.');
		assert.ok(!analyzedOnTheSpot(document, from), 'onDidOpenTextDocument debería analizarlo antes de esperar a los schemas.');

		await pending;
	});

	it('analiza en el momento si le preguntan por un documento que no ha visto', async () => {
		// Red de seguridad: VS Code puede pedir los tokens antes del evento de apertura,
		// o mientras la carga inicial de schemas —que es asíncrona— sigue en marcha.
		const document = new TestDocument(path.join(tempRoot, 'nunca-abierto.stxt'), DOCUMENT);
		const from = logMessages.length;

		assert.ok(tokenCount(document) > 0, 'El caché estaba frío y el provider no ha analizado.');
		assert.ok(analyzedOnTheSpot(document, from), 'Se esperaba justo el análisis en frío.');
	});
});
