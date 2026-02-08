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
// ******************
// Variables globales
// ******************
const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable'
];
const tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);
let diagnosticCollection;
const STXT_TAGS = {
    '@title': 'Título principal del documento',
    '@note': 'Nota informativa',
    '@todo': 'Tarea pendiente',
    '@author': 'Autor del documento'
};
const STXT_KEYS = [
    'author',
    'status',
    'version'
];
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
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'stxt' }, new StxtSemanticTokensProvider(), tokenLegend));
    context.subscriptions.push(vscode.languages.registerHoverProvider('stxt', new StxtHoverProvider()));
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
// *****************
// Tokens semánticos
// *****************
class StxtSemanticTokensProvider {
    provideDocumentSemanticTokens(document) {
        const builder = new vscode.SemanticTokensBuilder(tokenLegend);
        const lines = document.getText().split(/\r?\n/);
        lines.forEach((line, lineIndex) => {
            // @tag
            const tagMatch = line.match(/^(\s*)(@\w+)/);
            if (tagMatch) {
                const start = tagMatch[1].length;
                const length = tagMatch[2].length;
                builder.push(lineIndex, start, length, tokenTypes.indexOf('keyword'));
            }
            // key: value
            const kvMatch = line.match(/^(\s*)(\w+)\s*:\s*(.+)?$/);
            if (kvMatch) {
                const keyStart = kvMatch[1].length;
                const keyLength = kvMatch[2].length;
                builder.push(lineIndex, keyStart, keyLength, tokenTypes.indexOf('property'));
                if (kvMatch[3]) {
                    const valueStart = line.indexOf(kvMatch[3]);
                    const valueLength = kvMatch[3].length;
                    builder.push(lineIndex, valueStart, valueLength, tokenTypes.indexOf('string'));
                }
            }
            // [[link]]
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = linkRegex.exec(line))) {
                builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf('variable'));
            }
        });
        return builder.build();
    }
}
// **************
// Hover provider
// **************
class StxtHoverProvider {
    provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /@\w+/);
        if (!range) {
            return;
        }
        const word = document.getText(range);
        const description = STXT_TAGS[word];
        if (!description) {
            return;
        }
        return new vscode.Hover(new vscode.MarkdownString(`**${word}**\n\n${description}`));
    }
}
//# sourceMappingURL=extension.js.map