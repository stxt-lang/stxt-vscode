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
exports.analisysDoc = analisysDoc;
exports.getLastAnalysis = getLastAnalysis;
const vscode = __importStar(require("vscode"));
const Node_1 = require("./core/Node");
const LineIndentParser_1 = require("./core/LineIndentParser");
const lastAnalysisByUri = new Map();
function analisysDoc(document, diagnosticCollection) {
    console.log("Parse init...");
    const diagnostics = [];
    const tokens = [];
    const lines = document.getText().split(/\r?\n/);
    let lastNode = new Node_1.Node(0, 0, "empty", null, false, "");
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        console.log(`${lineNumber}: ${line}`);
        const lastLevel = lastNode.getLevel();
        const lastNodeText = lastNode.isTextNode();
        // Parseamos línea
        try {
            const lineIndent = LineIndentParser_1.LineIndentParser.parseLine(line, lastNodeText, lastLevel, lineNumber);
            if (lineIndent === null) {
                tokens.push({ line: index, startChar: 0, length: line.length, type: 'comment' });
            }
        }
        catch (e) {
            console.log("Error en " + lineNumber + e);
            const range = new vscode.Range(index, 0, index, line.length);
            diagnostics.push(new vscode.Diagnostic(range, "" + e, vscode.DiagnosticSeverity.Error));
        }
        // TODO Actualizar lastNode si hace falta
    });
    diagnosticCollection.set(document.uri, diagnostics);
    const result = { tokens };
    lastAnalysisByUri.set(document.uri.toString(), result);
    console.log("Parse end.");
    return result;
}
function getLastAnalysis(document) {
    return lastAnalysisByUri.get(document.uri.toString());
}
//# sourceMappingURL=STXTAnalysis.js.map