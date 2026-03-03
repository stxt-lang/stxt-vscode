import vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import { getSchema } from './SchemaLoader';

export class StxtHoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {

		const analysis = getLastAnalysis(document);
		if (!analysis) {
			return;
		}

		const node = analysis.nodeByLine.get(position.line);
		if (!node) {
			return;
		}

		const md = new vscode.MarkdownString();
		md.appendMarkdown(node.isTextNode() ? "### BLOCK ": "### INLINE");
		md.appendMarkdown(` (Level ${node.getLevel()})\n`);
		md.appendMarkdown(`- **Name:** \`${escapeMd(node.getName())}\`\n`);
		md.appendMarkdown(`- **Normalized name:** \`${escapeMd(node.getNormalizedName())}\`\n`);
		md.appendMarkdown(`- **Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);

		if (node.getNamespace()) {
			const schema = getSchema(node.getNamespace());
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
		md.appendMarkdown(node.isTextNode() ? `**Text**\n\n`: `- **Value:** \`${escapeMd(node.getValue())}\``);
		if(node.isTextNode()) {
			md.appendCodeblock(String(text), 'stxt');
		}

		md.isTrusted = false; // por seguridad, no permitir links/HTML
		return new vscode.Hover(md);
	}
}

// Escape mínimo para evitar que backticks rompan el markdown inline
function escapeMd(s: string): string {
	if (s === "") {
		return "<EMPTY>";
	}
	return s.replace(/`/g, '\\`');
}
