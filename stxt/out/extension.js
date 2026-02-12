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
const SemanticTokensProvider_1 = require("./extension/SemanticTokensProvider");
const FormattingProvider_1 = require("./extension/FormattingProvider");
const CompletionProvider_1 = require("./extension/CompletionProvider");
const HoverProvider_1 = require("./extension/HoverProvider");
const AnalysisDoc_1 = require("./extension/AnalysisDoc");
const Tokens_1 = require("./extension/Tokens");
let diagnosticCollection;
function activate(context) {
    //console.log('STXT extension activated');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('stxt');
    context.subscriptions.push(diagnosticCollection);
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.languageId === 'stxt') {
            //console.log("onDidOpenTextDocument");
            (0, AnalysisDoc_1.analisysDoc)(doc, diagnosticCollection);
        }
    }), vscode.workspace.onDidChangeTextDocument(e => {
        const doc = e.document;
        if (doc.languageId === 'stxt') {
            //console.log("onDidChangeTextDocument");
            (0, AnalysisDoc_1.analisysDoc)(doc, diagnosticCollection);
        }
    }), vscode.workspace.onDidCloseTextDocument(doc => {
        //console.log("onDidCloseTextDocument");
        diagnosticCollection.delete(doc.uri);
    }));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'stxt' }, new SemanticTokensProvider_1.StxtSemanticTokensProvider(), Tokens_1.tokenLegend));
    context.subscriptions.push(vscode.languages.registerHoverProvider('stxt', new HoverProvider_1.StxtHoverProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('stxt', new CompletionProvider_1.StxtCompletionProvider(), '@' // carácter que dispara sugerencias
    ));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('stxt', new FormattingProvider_1.StxtFormattingProvider()));
    for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === 'stxt') {
            //console.log('Documento STXT ya cargado inicial:', doc.uri.toString());
            (0, AnalysisDoc_1.analisysDoc)(doc, diagnosticCollection);
        }
    }
    console.log("INIT GRAMMARS!!!!!");
}
function deactivate() { }
//# sourceMappingURL=extension.js.map