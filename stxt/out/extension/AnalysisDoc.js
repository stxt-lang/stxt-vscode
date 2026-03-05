"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastAnalysis = getLastAnalysis;
exports.analysisAllDocs = analysisAllDocs;
exports.analysisDoc = analysisDoc;
const vscode_1 = __importDefault(require("vscode"));
const SchemaValidator_1 = require("../schema/SchemaValidator");
const SchemaLoader_1 = require("./SchemaLoader");
const extension_1 = require("../extension");
const Parser_1 = require("../core/Parser");
const ParseException_1 = require("../exceptions/ParseException");
const TemplateParser_1 = require("../template/TemplateParser");
const SchemaParser_1 = require("../schema/SchemaParser");
const TokenGeneratorObserver_1 = require("./TokenGeneratorObserver");
const ConditionalValidator_1 = require("../runtime/ConditionalValidator");
const LAST_ANALYSIS_BY_URI = new Map();
const SCHEMA_VALIDATOR = new SchemaValidator_1.SchemaValidator(new SchemaLoader_1.SchemaLoaderExtension());
function getLastAnalysis(document) {
    return LAST_ANALYSIS_BY_URI.get(document.uri.toString());
}
function analysisAllDocs() {
    for (const doc of vscode_1.default.workspace.textDocuments) {
        if (doc.languageId === 'stxt') {
            //console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
            analysisDoc(doc, extension_1.diagnosticCollection);
        }
    }
}
function analysisDoc(document, diagnosticCollection) {
    //console.log("Parse init...");
    const diagnostics = [];
    // Crear observer para generar tokens y nodeByLine durante el parsing
    const tokenObserver = new TokenGeneratorObserver_1.TokenGeneratorObserver();
    // Parsear documento con validación de schema
    const parser = new Parser_1.Parser();
    parser.registerObserver(tokenObserver);
    parser.registerValidator(new ConditionalValidator_1.ConditionalValidator(SCHEMA_VALIDATOR));
    const parseResult = parser.parseResult(document.getText());
    // Obtener tokens y nodeByLine generados por el observer
    const tokens = tokenObserver.getTokens();
    const nodeByLine = tokenObserver.getNodeByLine();
    const commentLines = tokenObserver.getCommentLines();
    const textLineByLineNumber = tokenObserver.getTextLineByLineNumber();
    // Convertir errores a diagnostics
    for (const error of parseResult.getErrors()) {
        const line = error.line > 0 ? error.line - 1 : 0;
        const lineText = document.lineAt(line).text;
        const range = new vscode_1.default.Range(line, 0, line, lineText.length);
        const severity = error.name === 'ValidationException'
            ? vscode_1.default.DiagnosticSeverity.Warning
            : vscode_1.default.DiagnosticSeverity.Error;
        diagnostics.push(new vscode_1.default.Diagnostic(range, `[${error.code}]: ${error.message}`, severity));
    }
    // Validaciones adicionales de template y schema
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.template", "Template", TemplateParser_1.transformTemplateNodeToSchema);
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.schema", "Schema", SchemaParser_1.transformNodeToSchema);
    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    // Guardamos resultados
    const result = { tokens, nodeByLine, commentLines, textLineByLineNumber };
    LAST_ANALYSIS_BY_URI.set(document.uri.toString(), result);
    //console.log("Parse end.");
    return result;
}
function validateSpecialDocument(nodes, diagnostics, namespace, typeName, transformer) {
    nodes.forEach((node) => {
        if (node.getNamespace() === namespace) {
            try {
                transformer(node);
            }
            catch (e) {
                if (e instanceof ParseException_1.ParseException) {
                    const line = e.line > 0 ? e.line - 1 : 0;
                    const range = new vscode_1.default.Range(line, 0, line, 100);
                    diagnostics.push(new vscode_1.default.Diagnostic(range, `${typeName} error [${e.code}]: ${e.message}`, vscode_1.default.DiagnosticSeverity.Error));
                }
                else if (e instanceof Error) {
                    const range = new vscode_1.default.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode_1.default.Diagnostic(range, `Error: ${e.message}`, vscode_1.default.DiagnosticSeverity.Error));
                }
                else {
                    const range = new vscode_1.default.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode_1.default.Diagnostic(range, `Unknown error: ${String(e)}`, vscode_1.default.DiagnosticSeverity.Error));
                }
            }
        }
    });
}
//# sourceMappingURL=AnalysisDoc.js.map