import * as vscode from 'vscode';
import { StxtSemanticTokensProvider } from './extension/SemanticTokensProvider';
import { StxtFormattingProvider } from './extension/FormattingProvider';
import { StxtCompletionProvider } from './extension/CompletionProvider';
import { StxtHoverProvider } from './extension/HoverProvider';
import { analysisDoc, analysisAllDocs } from './extension/AnalysisDoc';
import { tokenLegend } from './extension/Tokens';
import { registerSchemaLoader } from './extension/SchemaLoader';
import { getLogChannel, log } from './extension/Log';

export let diagnosticCollection: vscode.DiagnosticCollection;

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(getLogChannel());
	log.info('Extensión STXT activada.');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');

	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(doc => {
			if (doc.languageId === 'stxt') {
				log.trace(`onDidOpenTextDocument: ${doc.uri.toString()}`);
				analysisDoc(doc, diagnosticCollection);
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
		})
	);

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
			'@' // carácter que dispara sugerencias
		));

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			'stxt',
			new StxtFormattingProvider()
		)
	);

	await registerSchemaLoader(context, () => {
		analysisAllDocs();
	});
}

export function deactivate() { }
