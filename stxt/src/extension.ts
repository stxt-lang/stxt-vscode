import * as vscode from 'vscode';
import { StxtSemanticTokensProvider, tokenLegend } from './StxtSemanticTokensProvider';
import { StxtFormattingProvider } from './StxtFormattingProvider';
import { StxtCompletionProvider } from './StxtCompletionProvider';
import { StxtHoverProvider } from './StxtHoverProvider';
import { validateStxtDocument } from './STXTValidation';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('STXT extension activated');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
	context.subscriptions.push(diagnosticCollection);

	vscode.workspace.onDidOpenTextDocument(document => {
		if (document.languageId === 'stxt') {
            console.log('Documento STXT abierto:', document.uri.toString());
            validateStxtDocument(document, diagnosticCollection);
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		const document = event.document;
		if (document.languageId === 'stxt') {
            console.log('Documento STXT modificado');
            validateStxtDocument(document, diagnosticCollection);
		}
	});

	vscode.workspace.onDidCloseTextDocument(document => {
    	diagnosticCollection.delete(document.uri);
	});

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
    maybeValidate(doc);
  }    
}

export function deactivate() {}

function maybeValidate(document: vscode.TextDocument) {
  if (document.languageId === 'stxt') {
    validateStxtDocument(document, diagnosticCollection);
  }
}
