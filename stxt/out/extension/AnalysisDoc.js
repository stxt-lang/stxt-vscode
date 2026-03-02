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
const LineIndentParser_1 = require("../core/LineIndentParser");
const NodeCreator_1 = require("../core/NodeCreator");
const SchemaValidator_1 = require("../schema/SchemaValidator");
const SchemaLoader_1 = require("./SchemaLoader");
const extension_1 = require("../extension");
const Parser_1 = require("../core/Parser");
const TemplateParser_1 = require("../template/TemplateParser");
const ParseException_1 = require("../exceptions/ParseException");
const SchemaParser_1 = require("../schema/SchemaParser");
const lastAnalysisByUri = new Map();
const SCHEMA_VALIDATOR = new SchemaValidator_1.SchemaValidator(new SchemaLoader_1.SchemaLoaderExtension());
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
    const lines = document.getText().split(/\r?\n/);
    const stack = [];
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNumber = index + 1;
        //console.log(`${lineNumber}: ${line}`);
        const lastNode = stack.length === 0 ? null : stack[stack.length - 1];
        const lastLevel = lastNode ? lastNode.getLevel() : 0;
        const lastNodeText = lastNode ? lastNode.isTextNode() : false;
        // Parseamos línea
        let lineIndent = null;
        try {
            lineIndent = (0, LineIndentParser_1.parseLineIndent)(line, lastNodeText, lastLevel, lineNumber);
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
            lastNode.addTextLine(lineIndent.lineWithoutIndent);
            //tokens.push({line: index, startChar: 0, length: line.length, type: 'string'});
            continue;
        }
        try {
            // Creamos el nuevo nodo y lo dejamos "abierto" en la pila (NO lo adjuntamos aún)
            const parent = stack.length === 0 ? null : stack[stack.length - 1];
            // Añadimos a stack
            const currentNode = (0, NodeCreator_1.createNode)(lineIndent, lineNumber, currentLevel, parent);
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
                }
                else {
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
    }
    ;
    closeToLevel(stack, 0, diagnostics);
    // Validaciones de template y schema
    validateSchema(document, diagnostics);
    validateTemplate(document, diagnostics);
    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    // Guardamos resultados
    const result = { tokens, nodeByLine };
    lastAnalysisByUri.set(document.uri.toString(), result);
    //console.log("Parse end.");
    return result;
}
function validateTemplate(document, diagnostics) {
    // Final // TODO Hacer mejor!! Mirar listado de nodos con namespace, hacer todo del inicial
    if (document.uri.toString().indexOf("stxt.template") !== -1) {
        console.log("Is template");
        try {
            const p = new Parser_1.Parser();
            const nodes = p.parse(document.getText()).getNodes();
            if (nodes.length === 1) {
                TemplateParser_1.TemplateParser.transformNodeToSchema(nodes[0]);
            }
        }
        catch (e) {
            if (e instanceof ParseException_1.ParseException) {
                const line = e.line > 0 ? e.line - 1 : 0;
                const range = new vscode.Range(line, 0, line, 100);
                diagnostics.push(new vscode.Diagnostic(range, `Parse error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
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
function validateSchema(document, diagnostics) {
    // Final // TODO Hacer mejor!! Mirar listado de nodos con namespace, hacer todo del inicial
    if (document.uri.toString().indexOf("stxt.schema") !== -1) {
        console.log("Is schema");
        try {
            const p = new Parser_1.Parser();
            const nodes = p.parse(document.getText()).getNodes();
            if (nodes.length === 1) {
                SchemaParser_1.SchemaParser.transformNodeToSchema(nodes[0]);
            }
        }
        catch (e) {
            if (e instanceof ParseException_1.ParseException) {
                const line = e.line > 0 ? e.line - 1 : 0;
                const range = new vscode.Range(line, 0, line, 100);
                diagnostics.push(new vscode.Diagnostic(range, `Parse error [${e.code}]: ${e.message}`, vscode.DiagnosticSeverity.Error));
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
function closeToLevel(stack, targetLevel, diagnostics) {
    while (stack.length > targetLevel) {
        const completed = stack.pop();
        completed.freeze();
        if (stack.length > 0) {
            stack[stack.length - 1].addChild(completed);
        }
        // Validate grammar of completed
        try {
            if (completed.getNamespace() !== "") {
                SCHEMA_VALIDATOR.validate(completed);
            }
        }
        catch (e) {
            const range = new vscode.Range(completed.getLine() - 1, 0, completed.getLine() - 1, 100); // TODO Hacer longitud correctamente
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Warning));
        }
    }
}
//# sourceMappingURL=AnalysisDoc.js.map