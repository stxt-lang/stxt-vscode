import { Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { getSchema } from './SchemaLoader';

export class StxtHoverProvider implements HoverProvider {
	provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

		const analysis = getLastAnalysis(document);
		if (!analysis) {
			return;
		}

		// Verificar si es un comentario
		if (analysis.commentLines.has(position.line)) {
			const markdown = new MarkdownString();
			const commentText = document.lineAt(position.line).text;
			markdown.appendMarkdown("### 💬 Comment\n\n");
			markdown.appendCodeblock(commentText, 'stxt');
			markdown.isTrusted = false;
			return new Hover(markdown);
		}

		const node = analysis.nodeByLine.get(position.line);
		
		// Verificar si es una línea de texto dentro de un nodo TEXT BLOCK
		if (!node) {
			const parentNode = analysis.textLineByLineNumber.get(position.line);
			if (parentNode) {
				const markdown = new MarkdownString();
				const currentLine = document.lineAt(position.line).text;
				markdown.appendMarkdown("### 📝 Text Line\n");
				markdown.appendMarkdown(`Part of text block: **${escapeMd(parentNode.getName())}**\n\n`);
				markdown.appendCodeblock(currentLine, 'stxt');
				markdown.isTrusted = false;
				return new Hover(markdown);
			}
			return;
		}

		const markdown = new MarkdownString();
		markdown.appendMarkdown(node.isTextNode() ? "### 📄 TEXT BLOCK " : "### 📌 INLINE");
		markdown.appendMarkdown(` (Level ${node.getLevel()})\n`);
		markdown.appendMarkdown(`- **🏷️ Name:** \`${escapeMd(node.getName())}\`\n`);
		markdown.appendMarkdown(`- **🔤 Normalized name:** \`${escapeMd(node.getNormalizedName())}\`\n`);
		markdown.appendMarkdown(`- **🎯 Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);

		if (!node.isTextNode()) {
			markdown.appendMarkdown(`- **💎 Value:** \`${escapeMd(node.getValue())}\`\n`);
		}

		if (node.getNamespace()) {
			const schema = getSchema(node.getNamespace());
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
		return new Hover(markdown);
	}
}

// Escape mínimo para evitar que backticks rompan el markdown inline
function escapeMd(s: string): string {
	if (s === "") {
		return "<EMPTY>";
	}
	return s.replace(/`/g, '\\`');
}
