import { Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument, workspace } from 'vscode';
import { InlineNode } from '@stxt-lang/core';
import { getAnalysis } from './AnalysisDoc';
import { getSchemaForDocument } from './SchemaLoader';

/**
 * Hover over a node. Two modes, chosen by the `stxt.developerMode` setting:
 *
 * - **Normal** (the default): what the schema or template of the namespace says about the node
 *   — its `Description`, its type and, for an `ENUM`, the allowed values — the documentation of
 *   the grammar, meant for whoever writes the document. Node not declared, no hover.
 * - **Developer**: the technical card — form and level, names, value, schema type and allowed
 *   values, the description, the content of a text block — and a card for comments too.
 */
export class StxtHoverProvider implements HoverProvider {
	provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

		const analysis = getAnalysis(document);
		if (!analysis) {
			return;
		}

		const developerMode = workspace.getConfiguration('stxt', document).get<boolean>('developerMode', false);

		// A comment: only the developer card shows it
		if (analysis.commentLines.has(position.line)) {
			if (!developerMode) {
				return;
			}
			const markdown = new MarkdownString();
			const commentText = document.lineAt(position.line).text;
			markdown.appendMarkdown("### 💬 Comment\n\n");
			markdown.appendCodeblock(commentText, 'stxt');
			markdown.isTrusted = false;
			return new Hover(markdown);
		}

		// Nothing over the text lines of a block, nor over lines that open no node
		const node = analysis.nodeByLine.get(position.line);
		if (!node) {
			return;
		}

		// What the grammar of the namespace declares for the node, if anything: the resolution
		// chain is per document (STXT-DISCOVERY-SPEC section 7).
		const nodeDef = node.getNamespace()
			? getSchemaForDocument(document.uri, node.getNamespace())?.getNodeDefinition(node.getName())
			: undefined;
		const description = nodeDef?.getDescription();

		if (!developerMode) {
			if (!nodeDef) {
				return;
			}
			const markdown = new MarkdownString();
			if (description) {
				markdown.appendMarkdown(description + "\n\n---\n");
			}
			markdown.appendMarkdown(`**Type:** \`${nodeDef.getType()}\`${allowedValues(nodeDef.getValues())}\n`);
			markdown.isTrusted = false;
			return new Hover(markdown);
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

		if (nodeDef) {
			// Show the type
			const type = nodeDef.getType();
			markdown.appendMarkdown(`\n---\n`);
			markdown.appendMarkdown(`### 📋 Schema\n- **Type**: \`${type}\`\n`);

			// If it is an ENUM, show the allowed values
			if (type === 'ENUM' && nodeDef.getValues().size > 0) {
				markdown.appendMarkdown(`- **✅ Allowed values**: ${valueList(nodeDef.getValues())}\n`);
			}

			// Show the description if there is one
			if (description) {
				markdown.appendMarkdown(`\n---\n`);
				markdown.appendMarkdown(description + "\n");
			}
		}

		if (node.isTextNode()) {
			markdown.appendMarkdown(`\n---\n`);
			markdown.appendMarkdown(`### 📄 Text Content\n\n`);
			markdown.appendCodeblock(node.getText(), 'stxt');
		}

		markdown.isTrusted = false; // for safety, allow no links/HTML
		return new Hover(markdown);
	}
}

/** The allowed values of an ENUM as inline code, comma-separated. */
function valueList(values: ReadonlySet<string>): string {
	return Array.from(values).map(v => `\`${escapeMd(v)}\``).join(', ');
}

/** ` — a, b, c` after the type when there are allowed values (an ENUM); nothing otherwise. */
function allowedValues(values: ReadonlySet<string>): string {
	return values.size > 0 ? ` — ${valueList(values)}` : '';
}

// Minimal escaping so backticks do not break the inline markdown
function escapeMd(s: string): string {
	if (s === "") {
		return "<EMPTY>";
	}
	return s.replace(/`/g, '\\`');
}
