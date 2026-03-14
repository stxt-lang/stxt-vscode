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
        // Verificar si es un comentario
        if (analysis.commentLines.has(position.line)) {
            const markdown = new vscode_1.MarkdownString();
            const commentText = document.lineAt(position.line).text;
            markdown.appendMarkdown("### 💬 Comment\n\n");
            markdown.appendCodeblock(commentText, 'stxt');
            markdown.isTrusted = false;
            return new vscode_1.Hover(markdown);
        }
        const node = analysis.nodeByLine.get(position.line);
        // Verificar si es una línea de texto dentro de un nodo TEXT BLOCK
        if (!node) {
            const parentNode = analysis.textLineByLineNumber.get(position.line);
            if (parentNode) {
                const markdown = new vscode_1.MarkdownString();
                const currentLine = document.lineAt(position.line).text;
                markdown.appendMarkdown("### 📝 Text Line\n");
                markdown.appendMarkdown(`Part of text block: **${escapeMd(parentNode.getName())}**\n\n`);
                markdown.appendCodeblock(currentLine, 'stxt');
                markdown.isTrusted = false;
                return new vscode_1.Hover(markdown);
            }
            return;
        }
        const markdown = new vscode_1.MarkdownString();
        markdown.appendMarkdown(node.isTextNode() ? "### 📄 TEXT BLOCK " : "### 📌 INLINE");
        markdown.appendMarkdown(` (Level ${node.getLevel()})\n`);
        markdown.appendMarkdown(`- **🏷️ Name:** \`${escapeMd(node.getName())}\`\n`);
        markdown.appendMarkdown(`- **🔤 Normalized name:** \`${escapeMd(node.getNormalizedName())}\`\n`);
        markdown.appendMarkdown(`- **🎯 Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);
        if (!node.isTextNode()) {
            markdown.appendMarkdown(`- **💎 Value:** \`${escapeMd(node.getValue())}\`\n`);
        }
        if (node.getNamespace()) {
            const schema = (0, SchemaLoader_1.getSchema)(node.getNamespace());
            if (schema) {
                const nodeDef = schema.getNodeDefinition(node.getName());
                if (nodeDef) {
                    // Mostrar el tipo
                    const type = nodeDef.getType();
                    markdown.appendMarkdown(`\n---\n`);
                    markdown.appendMarkdown(`### 📋 Schema\n- **Type**: \`${type}\`\n`);
                    // Si es ENUM, mostrar los valores permitidos
                    if (type === 'ENUM') {
                        const values = nodeDef.getValues();
                        if (values.size > 0) {
                            const valueList = Array.from(values).map(v => `\`${escapeMd(v)}\``).join(', ');
                            markdown.appendMarkdown(`- **✅ Allowed values**: ${valueList}\n`);
                        }
                    }
                    // Mostrar la descripción si existe
                    const description = nodeDef.getDescription();
                    if (description) {
                        markdown.appendMarkdown(`\n---\n`);
                        markdown.appendMarkdown(description + "\n");
                    }
                }
            }
        }
        if (node.isTextNode()) {
            const text = node.getText();
            markdown.appendMarkdown(`\n---\n`);
            markdown.appendMarkdown(`### 📄 Text Content\n\n`);
            markdown.appendCodeblock(text, 'stxt');
        }
        markdown.isTrusted = false; // por seguridad, no permitir links/HTML
        return new vscode_1.Hover(markdown);
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