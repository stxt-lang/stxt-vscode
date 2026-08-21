import * as vscode from 'vscode';
import { StxtSemanticTokensProvider } from './extension/SemanticTokensProvider';
import { StxtFormattingProvider } from './extension/FormattingProvider';
import { StxtCompletionProvider } from './extension/CompletionProvider';
import { StxtHoverProvider } from './extension/HoverProvider';
import { StxtDefinitionProvider } from './extension/DefinitionProvider';
import { analysisDoc, analysisAllDocs } from './extension/AnalysisDoc';
import { tokenLegend } from './extension/Tokens';
import { registerSchemaLoader, ensureSchemasForDocument } from './extension/SchemaLoader';
import { getLogChannel, log } from './extension/Log';

export let diagnosticCollection: vscode.DiagnosticCollection;

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(getLogChannel());
	log.info('STXT extension activated.');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');

	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async doc => {
			if (doc.languageId === 'stxt') {
				log.trace(`onDidOpenTextDocument: ${doc.uri.toString()}`);
				// Analyze first, without waiting for anything: VS Code asks for the tokens
				// as soon as the document opens, and the providers read from the cache.
				analysisDoc(doc, diagnosticCollection);
				// The document may live outside the workspace, or in a subfolder of the
				// project: its schemas may sit above and not be loaded yet. If it finds any
				// new one, it re-analyzes everything on its own.
				await ensureSchemasForDocument(doc);
			}
		}),
		vscode.workspace.onDidChangeTextDocument(e => {
			const doc = e.document;
			if (doc.languageId === 'stxt') {
				log.trace(`onDidChangeTextDocument: ${doc.uri.toString()}`);
				analysisDoc(doc, diagnosticCollection);
			}
		}),
		vscode.workspace.onDidCloseTextDocument(doc => {
			if (doc.languageId === 'stxt') {
				log.trace(`onDidCloseTextDocument: ${doc.uri.toString()}`);
			}
			diagnosticCollection.delete(doc.uri);
		}),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('stxt.schemaValidation')) {
				log.info('stxt.schemaValidation changed: re-analyzing every open document.');
				analysisAllDocs();
			}
		})
	);

	// Documents already open at activation do not fire onDidOpenTextDocument: they are
	// analyzed here, before the providers are registered, so that the first one asked
	// already has tokens to return.
	analysisAllDocs();

	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			{ language: 'stxt' },
			new StxtSemanticTokensProvider(),
			tokenLegend
		));

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			'stxt',
			new StxtHoverProvider()
		));

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			'stxt',
			new StxtCompletionProvider(),
			'@' // trigger character for suggestions
		));

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			'stxt',
			new StxtFormattingProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(
			'stxt',
			new StxtDefinitionProvider()
		)
	);

	await registerSchemaLoader(context, () => {
		analysisAllDocs();
	});
}

export function deactivate() { }
