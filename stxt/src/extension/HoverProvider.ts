import { Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { getSchema } from './SchemaLoader';

export class StxtHoverProvider implements HoverProvider {
	provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

		const analysis = getLastAnalysis(document);
		if (!analysis) {
			return;
		}

		const node = analysis.nodeByLine.get(position.line);
		if (!node) {
			return;
		}

		const markdown = new MarkdownString();
		markdown.appendMarkdown(node.isTextNode() ? "### BLOCK ": "### INLINE");
		markdown.appendMarkdown(` (Level ${node.getLevel()})\n`);
		markdown.appendMarkdown(`- **Name:** \`${escapeMd(node.getName())}\`\n`);
		markdown.appendMarkdown(`- **Normalized name:** \`${escapeMd(node.getNormalizedName())}\`\n`);
		markdown.appendMarkdown(`- **Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);

		const text = node.getText();
		markdown.appendMarkdown(`\n---\n`);
		markdown.appendMarkdown(node.isTextNode() ? `**Text**\n\n`: `- **Value:** \`${escapeMd(node.getValue())}\`\n`);
		if(node.isTextNode()) {
			markdown.appendCodeblock(String(text), 'stxt');
		}

		if (node.getNamespace()) {
			const schema = getSchema(node.getNamespace());
			if (schema) {
				const nodeDef = schema.getNodeDefinition(node.getName());
				if (nodeDef) {
					// Mostrar el tipo
					const type = nodeDef.getType();
					markdown.appendMarkdown(`\n---\n`);
					markdown.appendMarkdown(`### Schema\nType: \`${type}\`\n`);

					// Si es ENUM, mostrar los valores permitidos
					if (type === 'ENUM') {
						const values = nodeDef.getValues();
						if (values.size > 0) {
							const valueList = Array.from(values).map(v => `\`${escapeMd(v)}\``).join(', ');
							markdown.appendMarkdown(`- **Allowed values:** ${valueList}\n`);
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
