import * as vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';

export class StxtHoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {

		const analysis = getLastAnalysis(document);
		if (!analysis) return;

		const node = analysis.nodeByLine.get(position.line);
		if (!node) return;

		const md = new vscode.MarkdownString();
		md.appendMarkdown(node.isTextNode() ? "### Block TEXT\n\n": "### Inline Node\n\n");

		md.appendMarkdown(`- **Name:** \`${escapeMd(node.getName())}\`\n`);
		md.appendMarkdown(`- **Normalized:** \`${escapeMd(node.getNormalizedName())}\`\n`);
		md.appendMarkdown(`- **Qualified:** \`${escapeMd(node.getQualifiedName())}\`\n`);

		const text = node.getText?.() ?? '';
		if (text && String(text).trim().length > 0) {
			md.appendMarkdown(`\n---\n`);
			md.appendMarkdown(node.isTextNode() ? `**Text**\n\n`: `- **Value:** ${node.getValue()}`);
			if(node.isTextNode()) {
				md.appendCodeblock(String(text), 'stxt');
			}
		}

		md.isTrusted = false; // por seguridad, no permitir links/HTML
		return new vscode.Hover(md);
	}
}

// Escape mínimo para evitar que backticks rompan el markdown inline
function escapeMd(s: string): string {
	return s.replace(/`/g, '\\`');
}
