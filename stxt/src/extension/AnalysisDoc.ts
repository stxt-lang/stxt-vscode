import vscode from 'vscode';
import { Node } from '../core/Node';
import { AnalysisResult } from './AnalysisResult';
import { SchemaValidator } from '../schema/SchemaValidator';
import { SchemaLoaderExtension } from './SchemaLoader';
import { diagnosticCollection } from '../extension';
import { Parser } from '../core/Parser';
import { ParseException } from '../exceptions/ParseException';
import { ParseResult } from '../core/ParseResult';
import { transformTemplateNodeToSchema } from '../template/TemplateParser';
import { transformNodeToSchema } from '../schema/SchemaParser';
import { Schema } from '../schema/Schema';
import { TokenGeneratorObserver } from './TokenGeneratorObserver';
import { ConditionalValidator } from '../runtime/ConditionalValidator';

const LAST_ANALYSIS_BY_URI  = new Map<string, AnalysisResult>();
const SCHEMA_VALIDATOR      = new SchemaValidator(new SchemaLoaderExtension());

export function getLastAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
    return LAST_ANALYSIS_BY_URI.get(document.uri.toString());
}

export function analysisAllDocs(): void{
	for (const doc of vscode.workspace.textDocuments) {
		if (doc.languageId === 'stxt') {
			//console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
			analysisDoc(doc, diagnosticCollection);
		}
	}
}

export function analysisDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): AnalysisResult {
    //console.log("Parse init...");
    const diagnostics: vscode.Diagnostic[] = [];

    // Crear observer para generar tokens y nodeByLine durante el parsing
    const tokenObserver = new TokenGeneratorObserver();

    // Parsear documento con validación de schema
    const parser = new Parser();
    parser.registerObserver(tokenObserver);
    parser.registerValidator(new ConditionalValidator(SCHEMA_VALIDATOR));
    const parseResult: ParseResult = parser.parseResult(document.getText());

    // Obtener tokens y nodeByLine generados por el observer
    const tokens = tokenObserver.getTokens();
    const nodeByLine = tokenObserver.getNodeByLine();
    const commentLines = tokenObserver.getCommentLines();

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

    // Validaciones adicionales de template y schema
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.template", "Template", transformTemplateNodeToSchema);
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.schema", "Schema", transformNodeToSchema);

    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);

    // Guardamos resultados
    const result: AnalysisResult = { tokens, nodeByLine, commentLines };
    LAST_ANALYSIS_BY_URI.set(document.uri.toString(), result);

    //console.log("Parse end.");
    return result;
}

function validateSpecialDocument(nodes: Node[], diagnostics: vscode.Diagnostic[], namespace: string, typeName: string,
     transformer: (node: Node) => Schema): void {
        
    nodes.forEach((node) => {
        if (node.getNamespace() === namespace) {
            try {
                transformer(node);
            } catch (e: unknown) {
                if (e instanceof ParseException) {
                    const line = e.line > 0 ? e.line - 1 : 0;
                    const range = new vscode.Range(line, 0, line, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `${typeName} error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else if (e instanceof Error) {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error: ${e.message}`, vscode.DiagnosticSeverity.Error));
                } else {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Unknown error: ${String(e)}`, vscode.DiagnosticSeverity.Error));
                }
            }
        }
    });
}