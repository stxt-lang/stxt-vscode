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
exports.StxtSemanticTokensProvider = exports.tokenLegend = void 0;
const vscode = __importStar(require("vscode"));
const Node_1 = require("./core/Node");
const LineIndentParser_1 = require("./core/LineIndentParser");
// *****************
// Tokens semánticos
// *****************
const tokenTypes = [
    'keyword',
    'property',
    'string',
    'variable',
    'comment'
];
exports.tokenLegend = new vscode.SemanticTokensLegend(tokenTypes);
class StxtSemanticTokensProvider {
    provideDocumentSemanticTokens(document) {
        console.log("Semantics init...");
        const builder = new vscode.SemanticTokensBuilder(exports.tokenLegend);
        const lines = document.getText().split(/\r?\n/);
        const stack = [];
        let lastNode = new Node_1.Node(0, 0, "Init", null, false, "");
        lines.forEach((line, lineIndex) => {
            const lastLevel = lastNode ? lastNode.getLevel() : 0;
            const lastNodeText = lastNode ? lastNode.isTextNode() : false;
            // Parseamos línea
            try {
                const lineIndent = LineIndentParser_1.LineIndentParser.parseLine(line, lastNodeText, lastLevel, lineIndex + 1);
            }
            catch (e) {
                //console.log("Error: " + e);
                // Añadir a errores!! ¿Está bien?
            }
            // Comment (hacer mejor)
            if (line.trim().startsWith("#")) {
                builder.push(lineIndex, 0, line.length, tokenTypes.indexOf('comment'));
            }
        });
        console.log("Semantics end.");
        return builder.build();
    }
}
exports.StxtSemanticTokensProvider = StxtSemanticTokensProvider;
//# sourceMappingURL=StxtSemanticTokensProvider.js.map