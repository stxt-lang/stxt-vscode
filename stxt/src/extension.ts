import * as vscode from 'vscode';
import { StxtSemanticTokensProvider } from './extension/SemanticTokensProvider';
import { StxtFormattingProvider } from './extension/FormattingProvider';
import { StxtCompletionProvider } from './extension/CompletionProvider';
import { StxtHoverProvider } from './extension/HoverProvider';
import { analisysDoc } from './extension/AnalysisDoc';
import { tokenLegend } from './extension/Tokens';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
	//console.log('STXT extension activated');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');

	context.subscriptions.push(diagnosticCollection);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(doc => {
			if (doc.languageId === 'stxt') {
				//console.log("onDidOpenTextDocument");
				analisysDoc(doc, diagnosticCollection);
			}
		}),
		vscode.workspace.onDidChangeTextDocument(e => {
			const doc = e.document;
			if (doc.languageId === 'stxt') {
				//console.log("onDidChangeTextDocument");
				analisysDoc(doc, diagnosticCollection);
			}
		}),
		vscode.workspace.onDidCloseTextDocument(doc => {
			//console.log("onDidCloseTextDocument");
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

	for (const doc of vscode.workspace.textDocuments) {
		if (doc.languageId === 'stxt') {
			//console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
			analisysDoc(doc, diagnosticCollection);
		}
	}

	console.log("INIT GRAMMARS!!!!!");
}

export function deactivate() { }
