import * as vscode from 'vscode';
import { StxtSemanticTokensProvider } from './extension/SemanticTokensProvider';
import { StxtFormattingProvider } from './extension/FormattingProvider';
import { StxtCompletionProvider } from './extension/CompletionProvider';
import { StxtHoverProvider } from './extension/HoverProvider';
import { analysisDoc, analysisAllDocs } from './extension/AnalysisDoc';
import { tokenLegend } from './extension/Tokens';
import { registerSchemaLoader, ensureSchemasForDocument } from './extension/SchemaLoader';
import { getLogChannel, log } from './extension/Log';

export let diagnosticCollection: vscode.DiagnosticCollection;

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(getLogChannel());
	log.info('Extensión STXT activada.');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');

	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async doc => {
			if (doc.languageId === 'stxt') {
				log.trace(`onDidOpenTextDocument: ${doc.uri.toString()}`);
				// Analizar primero, sin esperar a nada: VS Code pide los tokens nada más
				// abrir y los providers leen del caché.
				analysisDoc(doc, diagnosticCollection);
				// El documento puede estar fuera del workspace, o en una subcarpeta del
				// proyecto: sus schemas pueden estar por encima y no haberse cargado aún.
				// Si encuentra alguno nuevo, vuelve a analizarlo todo por su cuenta.
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
		})
	);

	// Los documentos ya abiertos al activar no disparan onDidOpenTextDocument: se analizan
	// aquí, antes de registrar los providers, para que el primero que pregunte ya tenga
	// tokens que devolver.
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
