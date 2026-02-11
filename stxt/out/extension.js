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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const StxtSemanticTokensProvider_1 = require("./StxtSemanticTokensProvider");
const StxtFormattingProvider_1 = require("./StxtFormattingProvider");
const StxtCompletionProvider_1 = require("./StxtCompletionProvider");
const StxtHoverProvider_1 = require("./StxtHoverProvider");
// ******************
// Variables globales
// ******************
let diagnosticCollection;
// ******************************
// Método principal de activación
// ******************************
function activate(context) {
    console.log('STXT extension activated');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
    context.subscriptions.push(diagnosticCollection);
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'stxt') {
            handleStxtDocument(document);
        }
    });
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.languageId === 'stxt') {
            handleStxtChangeTextDocument(event, document);
        }
    });
    vscode.workspace.onDidCloseTextDocument(document => {
        diagnosticCollection.delete(document.uri);
    });
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'stxt' }, new StxtSemanticTokensProvider_1.StxtSemanticTokensProvider(), StxtSemanticTokensProvider_1.tokenLegend));
    context.subscriptions.push(vscode.languages.registerHoverProvider('stxt', new StxtHoverProvider_1.StxtHoverProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('stxt', new StxtCompletionProvider_1.StxtCompletionProvider(), '@' // carácter que dispara sugerencias
    ));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('stxt', new StxtFormattingProvider_1.StxtFormattingProvider()));
}
function deactivate() { }
// *************************************
// Modificación y apertura de documentos
// *************************************
function handleStxtDocument(document) {
    console.log('Documento STXT abierto:', document.uri.toString());
    const text = document.getText();
    console.log('Procesando STXT:\n', text);
    validateStxtDocument(document);
}
function handleStxtChangeTextDocument(event, document) {
    console.log('Documento STXT modificado');
    validateStxtDocument(document);
}
// ************************
// Validación del documento
// ************************
function validateStxtDocument(document) {
    const diagnostics = [];
    const lines = document.getText().split(/\r?\n/);
    lines.forEach((line, index) => {
        const lineNumber = index;
        // Regla 1: etiqueta sin :
        if (line.trim().startsWith('@') && !line.includes(':')) {
            const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'Las etiquetas STXT deben usar ":"', vscode.DiagnosticSeverity.Error));
        }
        // Regla 2: key: sin valor
        if (/^\s*\w+\s*:\s*$/.test(line)) {
            const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(new vscode.Diagnostic(range, 'La clave tiene que tener un valor', vscode.DiagnosticSeverity.Warning));
        }
    });
    diagnosticCollection.set(document.uri, diagnostics);
}
//# sourceMappingURL=extension.js.map