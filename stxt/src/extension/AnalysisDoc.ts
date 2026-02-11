import * as vscode from 'vscode';
import { Node } from '../core/Node';
import { LineIndent } from '../core/LineIndent';
import { LineIndentParser } from '../core/LineIndentParser';
import { AnalysisResult } from './AnalysisResult';
import { StxtToken } from './Tokens';
import { createNode } from '../core/NodeCreator';

const lastAnalysisByUri = new Map<string, AnalysisResult>();

export function getLastAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
  return lastAnalysisByUri.get(document.uri.toString());
}

export function analisysDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): AnalysisResult  {
    console.log("Parse init...");
    const diagnostics: vscode.Diagnostic[] = [];
    const tokens: StxtToken[] = [];

    const lines = document.getText().split(/\r?\n/);

    let lastNodeValid: Node = new Node(0,0,"empty",null,false,"");

    for (let index = 0; index<lines.length; index++) {
        const line = lines[index];
        const lineNumber = index + 1;

        console.log(`${lineNumber}: ${line}`);

        const lastLevel = lastNodeValid.getLevel();
        const lastNodeText = lastNodeValid.isTextNode();

        // Parseamos línea
        let lineIndent: LineIndent | null = null;
        try
        {
            lineIndent = LineIndentParser.parseLine(line,lastNodeText,lastLevel,lineNumber);
        }
        catch(e)
        {
            console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index,0,index,line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
            continue;
        }

        // Es un comentario
        if (lineIndent === null) {
            tokens.push({line: index, startChar: 0, length: line.length, type: 'comment'});            
            continue;
        }

		const currentLevel = lineIndent.indentLevel;

		// Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
		// añadimos línea de texto y no creamos nodo.
		if (lastNodeText && currentLevel > lastLevel) {
			lastNodeValid!.addTextLine(lineIndent.lineWithoutIndent);
			continue;
		}

        try
        {
		    lastNodeValid = createNode(lineIndent, lineNumber, currentLevel, null);

            // TODO: Añadir tipo de línea,...
        }
        catch(e)
        {
            console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index,0,index,line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
            continue;
        }
    };

    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    const result = { tokens };
    lastAnalysisByUri.set(document.uri.toString(), result);
    console.log("Parse end.");
    return result;
}


