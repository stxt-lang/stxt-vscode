import * as vscode from 'vscode';
import { Node } from './core/Node';
import { LineIndent } from './core/LineIndent';
import { LineIndentParser } from './core/LineIndentParser';

export function analisysDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    console.log("Parse init...");
    const diagnostics: vscode.Diagnostic[] = [];

    const lines = document.getText().split(/\r?\n/);

    let lastNode: Node = new Node(0,0,"empty",null,false,"");

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        console.log(`${lineNumber}: ${line}`);

        const lastLevel = lastNode.getLevel();
        const lastNodeText = lastNode.isTextNode();

        // Parseamos línea
        try
        {
            const lineIndent: LineIndent | null = LineIndentParser.parseLine(line,lastNodeText,lastLevel,lineNumber);
        }
        catch(e)
        {
            console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index,0,index,line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
        }

        // TODO Actualizar lastNode si hace falta
    });

    diagnosticCollection.set(document.uri, diagnostics);
    console.log("Parse end.");
}



