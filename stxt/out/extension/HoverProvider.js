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
exports.StxtHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const AnalysisDoc_1 = require("./AnalysisDoc");
class StxtHoverProvider {
    provideHover(document, position) {
        const analysis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        if (!analysis)
            return;
        const node = analysis.nodeByLine.get(position.line);
        if (!node)
            return;
        const md = new vscode.MarkdownString();
        md.appendMarkdown(node.isTextNode() ? "### Block TEXT\n\n" : "### Inline Node\n\n");
        md.appendMarkdown(`- **Name:** \`${escapeMd(node.getName())}\`\n`);
        md.appendMarkdown(`- **Normalized:** \`${escapeMd(node.getNormalizedName())}\`\n`);
        md.appendMarkdown(`- **Qualified:** \`${escapeMd(node.getQualifiedName())}\`\n`);
        const text = node.getText();
        md.appendMarkdown(`\n---\n`);
        md.appendMarkdown(node.isTextNode() ? `**Text**\n\n` : `- **Value:** ${node.getValue()}`);
        if (node.isTextNode()) {
            md.appendCodeblock(String(text), 'stxt');
        }
        md.isTrusted = false; // por seguridad, no permitir links/HTML
        return new vscode.Hover(md);
    }
}
exports.StxtHoverProvider = StxtHoverProvider;
// Escape mínimo para evitar que backticks rompan el markdown inline
function escapeMd(s) {
    return s.replace(/`/g, '\\`');
}
//# sourceMappingURL=HoverProvider.js.map