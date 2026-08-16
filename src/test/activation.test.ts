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
 * A document must have colour **from the very first moment**.
 *
 * The providers read the analysis from the `AnalysisDoc` cache, so everything depends on
 * the document being analyzed by the time VS Code asks for the tokens, which is as soon as
 * it paints it. When it is not, the editor gets an empty list and the file stays black and
 * white until it is edited —the editor never asks again on its own—. The three paths by
 * which a document reaches the provider are covered here.
 */

const TOKENS = new StxtSemanticTokensProvider();

// No namespace on purpose: what is checked is the colour, not the validation.
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

// How many semantic-token integers a provider returns for the document: 0 means "no colour".
function tokensOf(provider: unknown, document: TestDocument): number {
	return (provider as TokensProvider).provideDocumentSemanticTokens(asTextDocument(document)).data.length;
}

function tokenCount(document: TestDocument): number {
	return tokensOf(TOKENS, document);
}

/**
 * If the provider had to analyze on its own, `getAnalysis` says so in the log. It is the
 * only way to tell "the document was already analyzed" from "the safety net rescued it",
 * because from the outside both return the same tokens.
 */
function analyzedOnTheSpot(document: TestDocument, from: number): boolean {
	return logMessages.slice(from).some(message => message.includes('Cold analysis') && message.includes(document.uri.toString()));
}

describe('activate: the document has colour from the very first moment', () => {
	let tempRoot: string;

	before(async () => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stxt-activate-'));
		setWorkspaceFolder(tempRoot);
	});

	after(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	it('analyzes the documents that were already open before registering the providers', async () => {
		// A document opened before the extension starts never receives
		// onDidOpenTextDocument: if activate() does not analyze it, nobody does. And it must
		// be analyzed before the provider is registered, because the schema load that comes
		// afterwards is asynchronous and the editor does not wait for it to finish.
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

		assert.ok(tokensAtRegistration > 0, 'The already-open document had no tokens when the provider was registered.');
		assert.ok(!coldAtRegistration, 'It should be analyzed in activate(), without falling back to the safety net.');
	});

	it('analyzes a document opened while the extension is already active', async () => {
		const document = new TestDocument(path.join(tempRoot, 'nuevo.stxt'), DOCUMENT);

		// No await on purpose: VS Code does not wait for the listener to finish either, so
		// this is what the editor sees when painting, with the synchronous part of the handler
		// done and the schema lookup still in progress.
		const pending = openDocument(asTextDocument(document));
		const from = logMessages.length;

		assert.ok(tokenCount(document) > 0, 'The freshly opened document ended up without tokens.');
		assert.ok(!analyzedOnTheSpot(document, from), 'onDidOpenTextDocument should analyze it before waiting for the schemas.');

		await pending;
	});

	it('analyzes on the spot when asked about a document it has never seen', async () => {
		// Safety net: VS Code may ask for the tokens before the open event, or while the
		// initial schema load —which is asynchronous— is still in progress.
		const document = new TestDocument(path.join(tempRoot, 'nunca-abierto.stxt'), DOCUMENT);
		const from = logMessages.length;

		assert.ok(tokenCount(document) > 0, 'The cache was cold and the provider did not analyze.');
		assert.ok(analyzedOnTheSpot(document, from), 'The cold analysis was expected here.');
	});
});
