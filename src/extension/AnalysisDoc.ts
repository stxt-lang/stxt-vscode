import vscode from 'vscode';
import { Node, Parser, ParseException, ParseResult, Schema, SchemaValidator, ConditionalValidator, ValidationException, transformNodeToSchema, transformTemplateNodeToSchema } from '@stxt-lang/core';
import { AnalysisResult } from './AnalysisResult';
import { SchemaLoaderExtension, getSchemasForDocument } from './SchemaLoader';
import { diagnosticCollection } from '../extension';
import { TokenGeneratorObserver } from './TokenGeneratorObserver';
import { log } from './Log';

const LAST_ANALYSIS_BY_URI  = new Map<string, AnalysisResult>();

/** Código que emite `SchemaValidator` cuando no encuentra el schema del namespace de un nodo. */
const SCHEMA_NOT_FOUND      = 'SCHEMA_NOT_FOUND';

/**
 * El análisis que usan los providers: el del caché si el documento ya se ha analizado,
 * y si no uno nuevo, hecho en el momento.
 *
 * El caso frío es real y hay que cubrirlo: VS Code pide los semantic tokens en cuanto
 * pinta el documento, y eso puede llegar antes que el `onDidOpenTextDocument` que lo
 * analiza —o antes de que termine la carga inicial de schemas, que es asíncrona—. Un
 * provider que se limitara a mirar el caché devolvería vacío y el documento se quedaría
 * **sin colorear hasta que se tocase**.
 *
 * @param document documento del que se quiere el análisis.
 * @returns el análisis, o undefined si la extensión aún no está activada (solo en tests).
 */
export function getAnalysis(document: vscode.TextDocument): AnalysisResult | undefined {
    const cached = LAST_ANALYSIS_BY_URI.get(document.uri.toString());

    if (cached || !diagnosticCollection) {
        return cached;
    }

    log.trace(`Análisis en frío, el caché no lo tenía: ${document.uri.toString()}`);
    return analysisDoc(document, diagnosticCollection);
}

export function analysisAllDocs(): void{
	for (const doc of vscode.workspace.textDocuments) {
		if (doc.languageId === 'stxt') {
			log.trace(`Reanalizando documento abierto: ${doc.uri.toString()}`);
			analysisDoc(doc, diagnosticCollection);
		}
	}
}

export function analysisDoc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): AnalysisResult {
    const diagnostics: vscode.Diagnostic[] = [];

    // Crear observer para generar tokens y nodeByLine durante el parsing
    const tokenObserver = new TokenGeneratorObserver();

    // Parsear documento con validación de schema. El provider se crea con el Uri del
    // documento: cada documento valida contra su propia cadena de resolución
    // (STXT-DISCOVERY-SPEC sección 7), no contra la unión de todo lo cargado.
    const parser = new Parser();
    parser.registerObserver(tokenObserver);
    parser.registerValidator(new ConditionalValidator(new SchemaValidator(new SchemaLoaderExtension(document.uri))));
    const parseResult: ParseResult = parser.parseResult(document.getText());

    // Obtener tokens y nodeByLine generados por el observer
    const tokens = tokenObserver.getTokens();
    const nodeByLine = tokenObserver.getNodeByLine();
    const commentLines = tokenObserver.getCommentLines();
    const textLineByLineNumber = tokenObserver.getTextLineByLineNumber();

    // Convertir errores a diagnostics
    const hasSchemas = getSchemasForDocument(document.uri).length > 0;

    for (const error of parseResult.getErrors()) {
        // STXT-SPEC §15 y §17.2: los schemas son una capa separada y opcional. Si no hay
        // ninguno cargado en ninguna parte, un documento con namespace no está mal, solo
        // no se puede validar: avisar en cada nodo llenaría el fichero de subrayados.
        if (!hasSchemas && error.code === SCHEMA_NOT_FOUND) {
            continue;
        }

        const line = error.line > 0 ? error.line - 1 : 0;
        const lineText = document.lineAt(line).text;
        const range = new vscode.Range(line, 0, line, lineText.length);
        const severity = error instanceof ValidationException
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
    const result: AnalysisResult = { tokens, nodeByLine, commentLines, textLineByLineNumber };
    LAST_ANALYSIS_BY_URI.set(document.uri.toString(), result);

    log.trace(`Análisis de ${document.uri.toString()}: ${tokens.length} tokens, ${diagnostics.length} diagnósticos.`);
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