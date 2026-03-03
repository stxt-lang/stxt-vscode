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
const TemplateParser_1 = require("../template/TemplateParser");
const ParseException_1 = require("../exceptions/ParseException");
const SchemaParser_1 = require("../schema/SchemaParser");
const lastAnalysisByUri = new Map();
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
    return lastAnalysisByUri.get(document.uri.toString());
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
    const tokens = [];
    const nodeByLine = new Map();
    // Parsear documento con validación de schema
    const parser = new Parser_1.Parser();
    parser.registerValidator(new ConditionalValidator(SCHEMA_VALIDATOR));
    const parseResult = parser.parseResult(document.getText());
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
    const nodesToProcess = [...parseResult.getNodes()];
    while (nodesToProcess.length > 0) {
        const node = nodesToProcess.shift();
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
    validateSpecialDocument(document, diagnostics, "stxt.template", "Template", (node) => {
        TemplateParser_1.TemplateParser.transformNodeToSchema(node);
    });
    validateSpecialDocument(document, diagnostics, "stxt.schema", "Schema", (node) => {
        SchemaParser_1.SchemaParser.transformNodeToSchema(node);
    });
    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    // Guardamos resultados
    const result = { tokens, nodeByLine };
    lastAnalysisByUri.set(document.uri.toString(), result);
    //console.log("Parse end.");
    return result;
}
function generateTokensForNode(node, lineIndex, document, tokens) {
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
        }
        else {
            tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: 'macro' });
            tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: 'macro' });
        }
    }
    else {
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
        }
        else {
            tokens.push({ line: lineIndex, startChar: 0, length: colon, type: 'property' });
            tokens.push({ line: lineIndex, startChar: colon, length: 1, type: 'property' });
        }
        const valueStart = colon + 1;
        if (valueStart < line.length) {
            tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: 'string' });
        }
    }
}
function validateSpecialDocument(document, diagnostics, fileIdentifier, typeName, transformer) {
    // Final // TODO Hacer mejor!! Mirar listado de nodos con namespace, hacer todo del inicial
    if (document.uri.toString().indexOf(fileIdentifier) !== -1) {
        console.log(`Is ${typeName}`);
        const p = new Parser_1.Parser();
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
                transformer(result.getNodes()[0]);
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
    }
}
//# sourceMappingURL=AnalysisDoc.js.map