"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtSemanticTokensProvider = void 0;
const vscode_1 = __importDefault(require("vscode"));
const AnalysisDoc_1 = require("./AnalysisDoc");
const Tokens_1 = require("./Tokens");
class StxtSemanticTokensProvider {
    provideDocumentSemanticTokens(document) {
        const builder = new vscode_1.default.SemanticTokensBuilder(Tokens_1.tokenLegend);
        const analysis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        if (!analysis) {
            return builder.build();
        }
        for (const t of analysis.tokens) {
            builder.push(t.line, t.startChar, t.length, Tokens_1.tokenTypeIndex[t.type]);
        }
        return builder.build();
    }
}
exports.StxtSemanticTokensProvider = StxtSemanticTokensProvider;
//# sourceMappingURL=SemanticTokensProvider.js.map