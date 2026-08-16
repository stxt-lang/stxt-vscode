import { Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument } from 'vscode';
import { InlineNode } from '@stxt-lang/core';
import { getAnalysis } from './AnalysisDoc';
import { getSchemaForDocument } from './SchemaLoader';

export class StxtHoverProvider implements HoverProvider {
	provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

		const analysis = getAnalysis(document);
		if (!analysis) {
			return;
		}

		// Check whether it is a comment
		if (analysis.commentLines.has(position.line)) {
			const markdown = new MarkdownString();
			const commentText = document.lineAt(position.line).text;
			markdown.appendMarkdown("### 💬 Comment\n\n");
			markdown.appendCodeblock(commentText, 'stxt');
			markdown.isTrusted = false;
			return new Hover(markdown);
		}

		const node = analysis.nodeByLine.get(position.line);
		
		// Check whether it is a text line inside a TEXT BLOCK node
		if (!node) {
			/*
			const parentNode = analysis.textLineByLineNumber.get(position.line);
			const currentLine = document.lineAt(position.line);
			if (parentNode && !currentLine.isEmptyOrWhitespace && position.character >= currentLine.firstNonWhitespaceCharacterIndex) {
				const markdown = new MarkdownString();
				markdown.appendMarkdown("### 📝 Text Line\n");
				markdown.appendMarkdown(`Part of text block: \`${escapeMd(parentNode.getQualifiedName())}\`\n\n`);
				markdown.appendMarkdown(`Defined at line ${parentNode.getLine()}.`);
				markdown.isTrusted = false;
				return new Hover(markdown);
			}
			*/
			return;
		}

		const markdown = new MarkdownString();
		markdown.appendMarkdown(node.isTextNode() ? "### 📄 TEXT BLOCK " : "### 📌 INLINE");
		markdown.appendMarkdown(` (Level ${node.getLevel()})\n`);
		markdown.appendMarkdown(`- **🏷️ Name:** \`${escapeMd(node.getName())}\`\n`);
		markdown.appendMarkdown(`- **🔤 Canonical name:** \`${escapeMd(node.getCanonicalName())}\`\n`);
		markdown.appendMarkdown(`- **🎯 Qualified name:** \`${escapeMd(node.getQualifiedName())}\`\n`);

		if (node instanceof InlineNode) {
			markdown.appendMarkdown(`- **💎 Value:** \`${escapeMd(node.getValue())}\`\n`);
		}

		if (node.getNamespace()) {
			// The resolution chain is per document (STXT-DISCOVERY-SPEC section 7).
			const schema = getSchemaForDocument(document.uri, node.getNamespace());
			if (schema) {
				const nodeDef = schema.getNodeDefinition(node.getName());
				if (nodeDef) {
					// Show the type
					const type = nodeDef.getType();
					markdown.appendMarkdown(`\n---\n`);
					markdown.appendMarkdown(`### 📋 Schema\n- **Type**: \`${type}\`\n`);

					// If it is an ENUM, show the allowed values
					if (type === 'ENUM') {
						const values = nodeDef.getValues();
						if (values.size > 0) {
							const valueList = Array.from(values).map(v => `\`${escapeMd(v)}\``).join(', ');
							markdown.appendMarkdown(`- **✅ Allowed values**: ${valueList}\n`);
						}
					}

					// Show the description if there is one
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

		markdown.isTrusted = false; // for safety, allow no links/HTML
		return new Hover(markdown);
	}
}

// Minimal escaping so backticks do not break the inline markdown
function escapeMd(s: string): string {
	if (s === "") {
		return "<EMPTY>";
	}
	return s.replace(/`/g, '\\`');
}
