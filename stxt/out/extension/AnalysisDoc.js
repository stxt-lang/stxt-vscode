"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastAnalysis = getLastAnalysis;
exports.analysisAllDocs = analysisAllDocs;
exports.analisysDoc = analisysDoc;
const vscode = __importStar(require("vscode"));
const SchemaValidator_1 = require("../schema/SchemaValidator");
const SchemaLoader_1 = require("./SchemaLoader");
const extension_1 = require("../extension");
const Parser_1 = require("../core/Parser");
const ParseException_1 = require("../exceptions/ParseException");
const TemplateParser_1 = require("../template/TemplateParser");
const SchemaParser_1 = require("../schema/SchemaParser");
const TokenGeneratorObserver_1 = require("./TokenGeneratorObserver");
const LAST_ANALYSIS_BY_URI = new Map();
const SCHEMA_VALIDATOR = new SchemaValidator_1.SchemaValidator(new SchemaLoader_1.SchemaLoaderExtension());
// Wrapper del validador que solo valida nodos con namespace
class ConditionalValidator {
    schemaValidator;
    constructor(schemaValidator) {
        this.schemaValidator = schemaValidator;
    }
    validate(node) {
        // Solo validar si tiene namespace
        if (node.getNamespace() !== "") {
            this.schemaValidator.validate(node);
        }
    }
}
function getLastAnalysis(document) {
    return LAST_ANALYSIS_BY_URI.get(document.uri.toString());
}
function analysisAllDocs() {
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === 'stxt') {
            //console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
            analisysDoc(doc, extension_1.diagnosticCollection);
        }
    }
}
function analisysDoc(document, diagnosticCollection) {
    //console.log("Parse init...");
    const diagnostics = [];
    // Crear observer para generar tokens y nodeByLine durante el parsing
    const tokenObserver = new TokenGeneratorObserver_1.TokenGeneratorObserver();
    // Parsear documento con validación de schema
    const parser = new Parser_1.Parser();
    parser.registerObserver(tokenObserver);
    parser.registerValidator(new ConditionalValidator(SCHEMA_VALIDATOR));
    const parseResult = parser.parseResult(document.getText());
    // Obtener tokens y nodeByLine generados por el observer
    const tokens = tokenObserver.getTokens();
    const nodeByLine = tokenObserver.getNodeByLine();
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
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.template", "Template", TemplateParser_1.transformTemplateNodeToSchema);
    validateSpecialDocument(parseResult.getNodes(), diagnostics, "@stxt.schema", "Schema", SchemaParser_1.transformNodeToSchema);
    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    // Guardamos resultados
    const result = { tokens, nodeByLine };
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
                    const range = new vscode.Range(line, 0, line, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `${typeName} error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
                }
                else if (e instanceof Error) {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error: ${e.message}`, vscode.DiagnosticSeverity.Error));
                }
                else {
                    const range = new vscode.Range(0, 0, 0, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `Error desconocido: ${String(e)}`, vscode.DiagnosticSeverity.Error));
                }
            }
        }
    });
}
//# sourceMappingURL=AnalysisDoc.js.map