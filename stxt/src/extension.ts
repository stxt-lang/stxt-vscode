import * as vscode from 'vscode';

let diagnosticCollection: vscode.DiagnosticCollection;

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

}

export function deactivate() {}

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

function validateStxtDocument(document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];

    const lines = document.getText().split(/\r?\n/);

    lines.forEach((line, index) => {
        const lineNumber = index;

        // Regla 1: etiqueta sin :
        if (line.trim().startsWith('@') && !line.includes(':')) {
            const range = new vscode.Range(
                lineNumber,
                0,
                lineNumber,
                line.length
            );

            diagnostics.push(
                new vscode.Diagnostic(
                    range,
                    'Las etiquetas STXT deben usar ":"',
                    vscode.DiagnosticSeverity.Error
                )
            );
        }

        // Regla 2: key: sin valor
        if (/^\s*\w+\s*:\s*$/.test(line)) {
            const range = new vscode.Range(
                lineNumber,
                0,
                lineNumber,
                line.length
            );

            diagnostics.push(
                new vscode.Diagnostic(
                    range,
                    'La clave tiene que tener un valor',
                    vscode.DiagnosticSeverity.Warning
                )
            );
        }
    });

    diagnosticCollection.set(document.uri, diagnostics);
}
