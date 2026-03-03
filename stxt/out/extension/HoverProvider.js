"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StxtHoverProvider = void 0;
const vscode_1 = require("vscode");
const AnalysisDoc_1 = require("./AnalysisDoc");
const SchemaLoader_1 = require("./SchemaLoader");
class StxtHoverProvider {
    provideHover(document, position) {
        const analysis = (0, AnalysisDoc_1.getLastAnalysis)(document);
        if (!analysis) {
            return;
        }
        const node = analysis.nodeByLine.get(position.line);
        if (!node) {
            return;
        }
        const md = new vscode_1.MarkdownString();
        md.appendMarkdown(node.isTextNode() ? "### BLOCK " : "### INLINE");
        md.appendMarkdown(` (Level ${node.getLevel()})\n`);
        md.appendMarkdown(`- **Name:** \`${escapeMd(node.getName())}\`\n`);
        md.appendMarkdown(`- **Normalized name:** \`${escapeMd(node.getNormalizedName())}\`\n`);
        md.appendMarkdown(`- **Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);
        if (node.getNamespace()) {
            const schema = (0, SchemaLoader_1.getSchema)(node.getNamespace());
            if (schema) {
                const nodeDef = schema.getNodeDefinition(node.getName());
                if (nodeDef) {
                    const description = nodeDef.getDescription();
                    if (description) {
                        md.appendMarkdown(`\n---\n`);
                        md.appendMarkdown(description);
                    }
                }
            }
        }
        const text = node.getText();
        md.appendMarkdown(`\n---\n`);
        md.appendMarkdown(node.isTextNode() ? `**Text**\n\n` : `- **Value:** \`${escapeMd(node.getValue())}\``);
        if (node.isTextNode()) {
            md.appendCodeblock(String(text), 'stxt');
        }
        md.isTrusted = false; // por seguridad, no permitir links/HTML
        return new vscode_1.Hover(md);
    }
}
exports.StxtHoverProvider = StxtHoverProvider;
// Escape mínimo para evitar que backticks rompan el markdown inline
function escapeMd(s) {
    if (s === "") {
        return "<EMPTY>";
    }
    return s.replace(/`/g, '\\`');
}
//# sourceMappingURL=HoverProvider.js.map