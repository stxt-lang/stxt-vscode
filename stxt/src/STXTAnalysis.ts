import * as vscode from 'vscode';

// ************************
// Validación del documento
// ************************

export function analisysDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    console.log("Validate init...");
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
    console.log("Validate end.");
}



