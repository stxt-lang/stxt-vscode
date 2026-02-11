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
exports.StxtCompletionProvider = exports.STXT_TAGS = void 0;
const vscode = __importStar(require("vscode"));
// *********************
// Completation provider
// *********************
exports.STXT_TAGS = {
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
class StxtCompletionProvider {
    provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        // Sugerencias de tags
        if (linePrefix.trim().startsWith('@')) {
            return Object.keys(exports.STXT_TAGS).map(tag => {
                const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Keyword);
                item.insertText = `${tag}: `;
                item.detail = 'STXT tag';
                item.documentation = exports.STXT_TAGS[tag];
                return item;
            });
        }
        // Sugerencias de claves
        if (/^\s*\w*$/.test(linePrefix)) {
            return STXT_KEYS.map(key => {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
                item.insertText = `${key}: `;
                item.detail = 'STXT key';
                return item;
            });
        }
        return [];
    }
}
exports.StxtCompletionProvider = StxtCompletionProvider;
//# sourceMappingURL=StxtCompletionProvider.js.map