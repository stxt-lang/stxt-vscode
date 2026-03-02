import * as vscode from 'vscode';
import { Node } from '../core/Node';
import { AnalysisResult } from './AnalysisResult';
import { StxtToken } from './Tokens';
import { SchemaValidator } from '../schema/SchemaValidator';
import { SchemaLoaderExtension } from './SchemaLoader';
import { diagnosticCollection } from '../extension';
import { Parser } from '../core/Parser';
import { TemplateParser } from '../template/TemplateParser';
import { ParseException } from '../exceptions/ParseException';
import { SchemaParser } from '../schema/SchemaParser';
import { ParseResult } from '../core/ParseResult';
import { Validator } from '../processors/Validator';

const lastAnalysisByUri = new Map<string, AnalysisResult>();

const SCHEMA_VALIDATOR = new SchemaValidator(new SchemaLoaderExtension());

// Wrapper del validador que solo valida nodos con namespace
class ConditionalValidator implements Validator {
    private readonly schemaValidator: SchemaValidator;

    constructor(schemaValidator: SchemaValidator) {
        this.schemaValidator = schemaValidator;
    }

    validate(node: Node): void {
        // Solo validar si tiene namespace
        if (node.getNamespace() !== "") {
            this.schemaValidator.validate(node);
        }
    }
}

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

    // Parsear documento con validación de schema
    const parser = new Parser();
    parser.registerValidator(new ConditionalValidator(SCHEMA_VALIDATOR));
    const parseResult: ParseResult = parser.parseResult(document.getText());

    // Convertir errores a diagnostics
    for (const error of parseResult.getErrors()) {
        const line = error.line > 0 ? error.line - 1 : 0;
        const lineText = document.lineAt(line).text;
        const range = new vscode.Range(line, 0, line, lineText.length);
        const severity = error.name === 'ValidationException' 
            ? vscode.DiagnosticSeverity.Warning 
            : vscode.DiagnosticSeverity.Error;
        diagnostics.push(new vscode.Diagnostic(range, `[${error.code}]: ${error.message}`, severity));
    }

    // Construir tokens y nodeByLine desde los nodos parseados
    const nodesToProcess: Node[] = [...parseResult.getNodes()];
    while (nodesToProcess.length > 0) {
        const node = nodesToProcess.shift()!;
        const lineIndex = node.getLine() - 1;
        nodeByLine.set(lineIndex, node);

        // Generar tokens para este nodo
        generateTokensForNode(node, lineIndex, document, tokens);

        // Añadir hijos a la cola de procesamiento
        nodesToProcess.push(...node.getChildren());
    }

    // Generar tokens para comentarios (líneas que empiezan con #)
    const lines = document.getText().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) {
            tokens.push({ line: i, startChar: 0, length: line.length, type: 'comment' });
        }
    }

    // Validaciones adicionales de template y schema
    validateSchema(document, diagnostics);
    validateTemplate(document, diagnostics);

    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);

    // Guardamos resultados
    const result: AnalysisResult = { tokens, nodeByLine };
    lastAnalysisByUri.set(document.uri.toString(), result);

    //console.log("Parse end.");
    return result;
}

function generateTokensForNode(node: Node, lineIndex: number, document: vscode.TextDocument, tokens: StxtToken[]): void {
    const line = document.lineAt(lineIndex).text;

    if (node.isTextNode()) {
        const sepIndx = line.indexOf(">>");
        if (sepIndx === -1) {
            return;
        }

        const head = line.substring(0, sepIndx);
        const nsOpen = head.indexOf('(');
        const nsClose = head.indexOf(')');

        if (nsOpen !== -1 && nsClose !== -1) {
            tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'macro' });
            tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
            tokens.push({ line: lineIndex, startChar: nsClose + 1, length: line.length - nsClose - 1, type: 'macro' });
        } else {
            tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: 'macro' });
            tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: 'macro' });
        }
    } else {
        const colon = line.indexOf(':');
        if (colon === -1) {
            return;
        }

        const head = line.substring(0, colon);
        const nsOpen = head.indexOf('(');
        const nsClose = head.indexOf(')');

        if (nsOpen !== -1 && nsClose !== -1) {
            tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'property' });
            tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
            tokens.push({ line: lineIndex, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: 'property' });
        } else {
            tokens.push({ line: lineIndex, startChar: 0, length: colon, type: 'property' });
            tokens.push({ line: lineIndex, startChar: colon, length: 1, type: 'property' });
        }

        const valueStart = colon + 1;
        if (valueStart < line.length) {
            tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: 'string' });
        }
    }
}

function validateTemplate(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
    // Final // TODO Hacer mejor!! Mirar listado de nodos con namespace, hacer todo del inicial
    if (document.uri.toString().indexOf("stxt.template") !== -1) {
        console.log("Is template");
        const p = new Parser();
        const result = p.parseResult(document.getText());

        // Agregar errores de parsing
        for (const error of result.getErrors()) {
            const line = error.line > 0 ? error.line - 1 : 0;
            const range = new vscode.Range(line, 0, line, 100);
            diagnostics.push(new vscode.Diagnostic(range, `Parse error [${error.code}]: ${error.message}`, vscode.DiagnosticSeverity.Error));
        }

        // Si hay exactamente un nodo, intentar transformarlo
        if (result.getNodes().length === 1 && !result.hasErrors()) {
            try {
                TemplateParser.transformNodeToSchema(result.getNodes()[0]);
            } catch (e: unknown) {
                if (e instanceof ParseException) {
                    const line = e.line > 0 ? e.line - 1 : 0;
                    const range = new vscode.Range(line, 0, line, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Template error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else if (e instanceof Error) {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error desconocido: ${String(e)}`, vscode.DiagnosticSeverity.Error));
                }
            }
        }
    }
}

function validateSchema(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
    // Final // TODO Hacer mejor!! Mirar listado de nodos con namespace, hacer todo del inicial
    if (document.uri.toString().indexOf("stxt.schema") !== -1) {
        console.log("Is schema");
        const p = new Parser();
        const result = p.parseResult(document.getText());

        // Agregar errores de parsing
        for (const error of result.getErrors()) {
            const line = error.line > 0 ? error.line - 1 : 0;
            const range = new vscode.Range(line, 0, line, 100);
            diagnostics.push(new vscode.Diagnostic(range, `Parse error [${error.code}]: ${error.message}`, vscode.DiagnosticSeverity.Error));
        }

        // Si hay exactamente un nodo, intentar transformarlo
        if (result.getNodes().length === 1 && !result.hasErrors()) {
            try {
                SchemaParser.transformNodeToSchema(result.getNodes()[0]);
            } catch (e: unknown) {
                if (e instanceof ParseException) {
                    const line = e.line > 0 ? e.line - 1 : 0;
                    const range = new vscode.Range(line, 0, line, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Schema error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else if (e instanceof Error) {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error desconocido: ${String(e)}`, vscode.DiagnosticSeverity.Error));
                }
            }
        }
    }
}
