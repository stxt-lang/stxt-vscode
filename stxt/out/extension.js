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
const STXTValidation_1 = require("./STXTValidation");
let diagnosticCollection;
function activate(context) {
    console.log('STXT extension activated');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
    context.subscriptions.push(diagnosticCollection);
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'stxt') {
            console.log('Documento STXT abierto:', document.uri.toString());
            (0, STXTValidation_1.validateStxtDocument)(document, diagnosticCollection);
        }
    });
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.languageId === 'stxt') {
            console.log('Documento STXT modificado');
            (0, STXTValidation_1.validateStxtDocument)(document, diagnosticCollection);
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
    for (const doc of vscode.workspace.textDocuments) {
        maybeValidate(doc);
    }
}
function deactivate() { }
function maybeValidate(document) {
    if (document.languageId === 'stxt') {
        (0, STXTValidation_1.validateStxtDocument)(document, diagnosticCollection);
    }
}
//# sourceMappingURL=extension.js.map