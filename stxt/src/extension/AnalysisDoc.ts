import * as vscode from 'vscode';
import { Node } from '../core/Node';
import { LineIndent } from '../core/LineIndent';
import { parseLine } from '../core/LineIndentParser';
import { AnalysisResult } from './AnalysisResult';
import { StxtToken } from './Tokens';
import { createNode } from '../core/NodeCreator';
import { SchemaValidator } from '../schema/SchemaValidator';
import { SchemaLoaderExtension } from './SchemaLoader';
import { diagnosticCollection } from '../extension';

const lastAnalysisByUri = new Map<string, AnalysisResult>();

const SCHEMA_VALIDATOR = new SchemaValidator(new SchemaLoaderExtension());

export function getLastAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
    return lastAnalysisByUri.get(document.uri.toString());
}

export function analysisAllDocs(): void{
	for (const doc of vscode.workspace.textDocuments) {
		if (doc.languageId === 'stxt') {
			//console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
			analisysDoc(doc, diagnosticCollection);
		}
	}
}

export function analisysDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): AnalysisResult {
    //console.log("Parse init...");
    const diagnostics: vscode.Diagnostic[] = [];
    const tokens: StxtToken[] = [];
    const nodeByLine = new Map<number, Node>();

    const lines = document.getText().split(/\r?\n/);

    const stack: Node[] = [];

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNumber = index + 1;

        //console.log(`${lineNumber}: ${line}`);

        const lastNode: Node | null = stack.length === 0 ? null : stack[stack.length - 1];
        const lastLevel = lastNode ? lastNode.getLevel() : 0;
        const lastNodeText = lastNode ? lastNode.isTextNode() : false;

        // Parseamos línea
        let lineIndent: LineIndent | null = null;
        try {
            lineIndent = parseLine(line, lastNodeText, lastLevel, lineNumber);
        }
        catch (e) {
            //console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index, 0, index, line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
            continue;
        }

        // Es un comentario
        if (lineIndent === null) {
            tokens.push({ line: index, startChar: 0, length: line.length, type: 'comment' });
            continue;
        }

        const currentLevel = lineIndent.indentLevel;

        // Cerramos nodos hasta el nivel actual (esto "finaliza" y adjunta al padre/documentos)
        closeToLevel(stack, currentLevel, diagnostics);

        // Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
        // añadimos línea de texto y no creamos nodo.
        if (lastNodeText && currentLevel > lastLevel) {
            lastNode!.addTextLine(lineIndent.lineWithoutIndent);
            //tokens.push({line: index, startChar: 0, length: line.length, type: 'string'});
            continue;
        }

        try {
            // Creamos el nuevo nodo y lo dejamos "abierto" en la pila (NO lo adjuntamos aún)
            const parent: Node | null = stack.length === 0 ? null : stack[stack.length - 1];

            // Añadimos a stack
            const currentNode = createNode(lineIndent, lineNumber, currentLevel, parent);
            stack.push(currentNode);
            nodeByLine.set(index, currentNode);

            if (currentNode.isTextNode()) {
                const sepIndx = line.indexOf(">>");
                const head = line.substring(0, sepIndx); // "Clave (namespace) " (incluye espacios)
                const nsOpen = head.indexOf('(');
                const nsClose = head.indexOf(')');

                if (nsOpen !== -1 && nsClose !== -1) {
                    tokens.push({ line: index, startChar: 0, length: nsOpen, type: 'macro' });
                    tokens.push({ line: index, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
                    tokens.push({ line: index, startChar: nsClose + 1, length: line.length - nsClose - 1, type: 'macro' });
                }
                else {
                    tokens.push({ line: index, startChar: 0, length: sepIndx, type: 'macro' });
                    tokens.push({ line: index, startChar: sepIndx, length: 2, type: 'macro' });
                }
            }
            else {
                const colon = line.indexOf(':');
                const head = line.substring(0, colon); // "Clave (namespace)"
                const nsOpen = head.indexOf('(');
                const nsClose = head.indexOf(')');

                if (nsOpen !== -1 && nsClose !== -1) {
                    tokens.push({ line: index, startChar: 0, length: nsOpen, type: 'property' });
                    tokens.push({ line: index, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
                    tokens.push({ line: index, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: 'property' });
                } else {
                    tokens.push({ line: index, startChar: 0, length: colon, type: 'property' });
                    tokens.push({ line: index, startChar: colon, length: 1, type: 'property' });
                }

                const valueStart = colon + 1;
                if (valueStart < line.length) {
                    tokens.push({ line: index, startChar: valueStart, length: line.length - valueStart, type: 'string' });
                }
            }
        }
        catch (e) {
            //console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index, 0, index, line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
            continue;
        }
    };

    closeToLevel(stack, 0, diagnostics);

    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);

    // Guardamos resultados
    const result: AnalysisResult = { tokens, nodeByLine };
    lastAnalysisByUri.set(document.uri.toString(), result);

    //console.log("Parse end.");
    return result;
}

function closeToLevel(stack: Node[], targetLevel: number, diagnostics: vscode.Diagnostic[]): void {
    while (stack.length > targetLevel) {
        const completed = stack.pop()!;
        completed.freeze();

		if (stack.length > 0) {
		    stack[stack.length - 1].addChild(completed);
        }

        // Validate grammar of completed
        try {
            if (completed.getNamespace()!=="") {
                SCHEMA_VALIDATOR.validate(completed);
            }
        } catch (e) {
            const range = new vscode.Range(completed.getLine()-1, 0, completed.getLine()-1, 100); // TODO Hacer longitud correctamente
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Warning));
        }        
    }
}

