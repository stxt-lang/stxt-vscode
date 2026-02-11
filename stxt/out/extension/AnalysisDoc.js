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
exports.analisysDoc = analisysDoc;
const vscode = __importStar(require("vscode"));
const Node_1 = require("../core/Node");
const LineIndentParser_1 = require("../core/LineIndentParser");
const NodeCreator_1 = require("../core/NodeCreator");
const lastAnalysisByUri = new Map();
function getLastAnalysis(document) {
    return lastAnalysisByUri.get(document.uri.toString());
}
function analisysDoc(document, diagnosticCollection) {
    //console.log("Parse init...");
    const diagnostics = [];
    const tokens = [];
    const lines = document.getText().split(/\r?\n/);
    let lastNodeValid = new Node_1.Node(0, 0, "empty", null, false, "");
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNumber = index + 1;
        //console.log(`${lineNumber}: ${line}`);
        const lastLevel = lastNodeValid.getLevel();
        const lastNodeText = lastNodeValid.isTextNode();
        // Parseamos línea
        let lineIndent = null;
        try {
            lineIndent = LineIndentParser_1.LineIndentParser.parseLine(line, lastNodeText, lastLevel, lineNumber);
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
        // Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
        // añadimos línea de texto y no creamos nodo.
        if (lastNodeText && currentLevel > lastLevel) {
            lastNodeValid.addTextLine(lineIndent.lineWithoutIndent);
            //tokens.push({line: index, startChar: 0, length: line.length, type: 'string'});
            continue;
        }
        try {
            lastNodeValid = (0, NodeCreator_1.createNode)(lineIndent, lineNumber, currentLevel, null);
            // TODO: Añadir tipo de línea,...
            if (lastNodeValid.isTextNode()) {
                tokens.push({ line: index, startChar: 0, length: line.length, type: 'keyword' });
            }
            else {
                const colon = line.indexOf(':');
                const head = line.substring(0, colon); // "Clave (namespace)"
                const nsOpen = head.indexOf('(');
                const nsClose = head.indexOf(')', nsOpen + 1);
                if (nsOpen !== -1 && nsClose !== -1) {
                    tokens.push({ line: index, startChar: 0, length: nsOpen, type: 'property' });
                    tokens.push({ line: index, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
                    tokens.push({ line: index, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: 'property' });
                }
                else {
                    tokens.push({ line: index, startChar: 0, length: colon + 1, type: 'property' });
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
    // Fin de diagnosis
    diagnosticCollection.set(document.uri, diagnostics);
    const result = { tokens };
    lastAnalysisByUri.set(document.uri.toString(), result);
    //console.log("Parse end.");
    return result;
}
//# sourceMappingURL=AnalysisDoc.js.map