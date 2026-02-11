import * as vscode from 'vscode';
import { Node } from './core/Node';
import { LineIndent } from './core/LineIndent';
import { LineIndentParser } from './core/LineIndentParser';
import { AnalysisResult, StxtToken } from './STXTAnalysisTypes';

const lastAnalysisByUri = new Map<string, AnalysisResult>();

export function analisysDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): AnalysisResult  {
    console.log("Parse init...");
    const diagnostics: vscode.Diagnostic[] = [];
    const tokens: StxtToken[] = [];

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

            if (lineIndent === null) {
                tokens.push({line: index, startChar: 0, length: line.length, type: 'comment'});            
            }
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
    const result = { tokens };
    lastAnalysisByUri.set(document.uri.toString(), result);

    console.log("Parse end.");
    return result;
}

export function getLastAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
  return lastAnalysisByUri.get(document.uri.toString());
}

