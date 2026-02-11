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
const STXTAnalysis_1 = require("./STXTAnalysis");
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
        const builder = new vscode.SemanticTokensBuilder(exports.tokenLegend);
        const analysis = (0, STXTAnalysis_1.getLastAnalysis)(document);
        if (!analysis) {
            return builder.build();
        }
        for (const t of analysis.tokens) {
            if (t.type === 'comment') {
                builder.push(t.line, t.startChar, t.length, tokenTypes.indexOf('comment'));
            }
        }
        return builder.build();
    }
}
exports.StxtSemanticTokensProvider = StxtSemanticTokensProvider;
//# sourceMappingURL=StxtSemanticTokensProvider.js.map