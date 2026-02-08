import * as vscode from 'vscode';

// ******************
// Variables globales
// ******************

const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable'
];

const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);
let diagnosticCollection: vscode.DiagnosticCollection;

// ******************************
// Método principal de activación
// ******************************

export function activate(context: vscode.ExtensionContext) {
    console.log('STXT extension activated');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
	context.subscriptions.push(diagnosticCollection);

	vscode.workspace.onDidOpenTextDocument(document => {
		if (document.languageId === 'stxt') {
			handleStxtDocument(document);
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		const document = event.document;
		if (document.languageId === 'stxt') {
			handleStxtChangeTextDocument(event, document);
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
}

export function deactivate() {}

// *************************************
// Modificación y apertura de documentos
// *************************************

function handleStxtDocument(document: vscode.TextDocument) {
	console.log('Documento STXT abierto:', document.uri.toString());
    const text = document.getText();
    console.log('Procesando STXT:\n', text);
	validateStxtDocument(document);
}

function handleStxtChangeTextDocument(event: vscode.TextDocumentChangeEvent, document: vscode.TextDocument) {
	console.log('Documento STXT modificado');
	validateStxtDocument(document);
}

// ************************
// Validación del documento
// ************************

function validateStxtDocument(document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];

    const lines = document.getText().split(/\r?\n/);

    lines.forEach((line, index) => {
        const lineNumber = index;

        // Regla 1: etiqueta sin :
        if (line.trim().startsWith('@') && !line.includes(':')) {
            const range = new vscode.Range(lineNumber,0,lineNumber,line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'Las etiquetas STXT deben usar ":"', vscode.DiagnosticSeverity.Error));
        }

        // Regla 2: key: sin valor
        if (/^\s*\w+\s*:\s*$/.test(line)) {
            const range = new vscode.Range(lineNumber,0,lineNumber,line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'La clave tiene que tener un valor', vscode.DiagnosticSeverity.Warning));
        }
    });

    diagnosticCollection.set(document.uri, diagnostics);
}

// *****************
// Tokens especiales
// *****************

class StxtSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {

        const builder = new vscode.SemanticTokensBuilder(tokenLegend);
        const lines = document.getText().split(/\r?\n/);

        lines.forEach((line, lineIndex) => {

            // @tag
            const tagMatch = line.match(/^(\s*)(@\w+)/);
            if (tagMatch) {
                const start = tagMatch[1].length;
                const length = tagMatch[2].length;
                builder.push(lineIndex, start, length, tokenTypes.indexOf('keyword'));
            }

            // key: value
            const kvMatch = line.match(/^(\s*)(\w+)\s*:\s*(.+)?$/);
            if (kvMatch) {
                const keyStart = kvMatch[1].length;
                const keyLength = kvMatch[2].length;
                builder.push(lineIndex, keyStart, keyLength, tokenTypes.indexOf('property'));

                if (kvMatch[3]) {
                    const valueStart = line.indexOf(kvMatch[3]);
                    const valueLength = kvMatch[3].length;

                    builder.push(lineIndex, valueStart, valueLength, tokenTypes.indexOf('string'));
                }
            }

            // [[link]]
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = linkRegex.exec(line))) {
                builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf('variable'));
            }
        });

        return builder.build();
    }
}




