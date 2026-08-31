import { Observer, Node, Parser, Line, TextNode } from '@stxt-lang/core';
import { StxtToken } from './Tokens';
import { MarkdownState, newMarkdownState, tokenizeMarkdownLine } from './MarkdownTokenizer';

/** Schema type declared for a node by the grammar of its namespace, or undefined if none declares it. */
export type SchemaTypeResolver = (node: Node) => string | undefined;

/** Schema type whose block content is coloured as Markdown (STXT-SCHEMA-SPEC 9.7). */
const MARKDOWN = 'MARKDOWN';

export class TokenGeneratorObserver implements Observer {
	private tokens: StxtToken[] = [];
	private nodeByLine = new Map<number, Node>();
	private commentLines = new Set<number>();
	private textLineByLineNumber = new Map<number, TextNode>();
	private templateNodeByLine = new Map<number, Line>();

	// The block whose text lines are being received, and whether it is MARKDOWN: the type is
	// resolved once per block, and the tokenizer state (open code fence) lives with it.
	private currentTextNode: TextNode | null = null;
	private markdownState: MarkdownState | null = null;

	/**
	 * @param schemaTypeOf how to know the schema type of a node; without it no block is coloured
	 *        as Markdown (the inner observer of template contents, for instance, needs none).
	 */
	constructor(private readonly schemaTypeOf?: SchemaTypeResolver) {
	}

	onTextLine(node: TextNode, lineNumber: number, _lineString: string, line: Line): void {
		// Remember the parent node of the text lines
		const lineIndex = lineNumber - 1; // lineNumber is 1-indexed
		this.textLineByLineNumber.set(lineIndex, node);
		
		// Keep line information for lines inside template nodes
		if (this.isTemplateContentNode(node)) {
			// lineNumber is 1-indexed and absolute within the document
			this.templateNodeByLine.set(lineNumber, line);
		}

		// Colour the content of MARKDOWN blocks. The tokens are emitted here, line by line, so
		// that they stay in document order with the rest of the tokens.
		if (node !== this.currentTextNode) {
			this.currentTextNode = node;
			this.markdownState = this.isMarkdown(node) ? newMarkdownState() : null;
		}
		if (this.markdownState) {
			// The content starts where the indentation ends
			const offset = line.contentStart;
			for (const span of tokenizeMarkdownLine(line.content, this.markdownState)) {
				this.tokens.push({ line: lineIndex, startChar: offset + span.startChar, length: span.length, type: span.type });
			}
		}
	}

	private isMarkdown(node: TextNode): boolean {
		if (!this.schemaTypeOf) {
			return false;
		}
		try {
			return this.schemaTypeOf(node) === MARKDOWN;
		} catch {
			return false;
		}
	}

	onCreate(node: Node, line: string): void {
		const lineIndex = node.getLine() - 1;
		
		// Store the node in the map
		this.nodeByLine.set(lineIndex, node);

		// Generate the tokens for this node
		this.generateTokensForNode(node, lineIndex, line);

		// Reset the map for template nodes
		if (this.isTemplateContentNode(node)) {
			this.templateNodeByLine.clear();
		}
	}

	onFinish(node: Node): void {
		// If it is a special template node, parse its content to colour it
		if (this.isTemplateContentNode(node)) {
			this.parseTemplateContent(node);
			// Clear the map after processing
			this.templateNodeByLine.clear();
		}
	}

	private isTemplateContentNode(node: Node): boolean {
		if (node.getNamespace() !== '@stxt.template') {
			return false;
		}
		const normalizedName = node.getCanonicalName();
		return normalizedName === 'structure' || normalizedName === 'description';
	}

	private parseTemplateContent(node: Node): void {
		try {
			const content = node.getText();
			if (!content || content.trim() === '') {
				return;
			}

			// Create a parser without schema validation
			const parser = new Parser();
			
			// Create an inner observer to generate the tokens
			const innerObserver = new TokenGeneratorObserver();
			parser.registerObserver(innerObserver);

			// Parse the node content
			parser.parseResult(content);

			// Take the generated tokens and adjust their line numbers and startChar
			const lineOffset = node.getLine(); // Offset from the start of the node (1-indexed)
			const innerTokens = innerObserver.getTokens();

			for (const token of innerTokens) {
				// token.line is 0-indexed; we need the absolute document line (1-indexed)
				const absoluteLineNumber = lineOffset + token.line + 1;
				
				// Get the indentation of the original line
				const originalLine = this.templateNodeByLine.get(absoluteLineNumber);
				// The content starts where the indentation ends
				const offset = originalLine ? originalLine.contentStart : 0;

				this.tokens.push({
					line: token.line + lineOffset,
					startChar: token.startChar + offset,
					length: token.length,
					type: token.type
				});
			}
		} catch {
			// On a parse error, simply add no tokens for this node
		}
	}

	onComment(lineNumber: number, line: string): void {
		// Generate the token for a comment (lines starting with #)
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith('#')) {
			const lineIndex = lineNumber - 1;
			this.commentLines.add(lineIndex);
			this.tokens.push({ 
				line: lineIndex, 
				startChar: 0, 
				length: line.length, 
				type: 'comment' 
			});
		}
	}

	getTokens(): StxtToken[] {
		return this.tokens;
	}

	getNodeByLine(): Map<number, Node> {
		return this.nodeByLine;
	}

	getCommentLines(): Set<number> {
		return this.commentLines;
	}

	getTextLineByLineNumber(): Map<number, TextNode> {
		return this.textLineByLineNumber;
	}

	private generateTokensForNode(node: Node, lineIndex: number, line: string): void {
		if (node.isTextNode()) {
			const sepIndx = line.indexOf(">>");
			if (sepIndx === -1) {
				return;
			}

			const head = line.substring(0, sepIndx);
			const nsOpen = head.indexOf('(');
			const nsClose = head.indexOf(')');

			if (nsOpen !== -1 && nsClose !== -1) {
				this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'macro' });
				this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
				this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: line.length - nsClose - 1, type: 'macro' });
			} else {
				this.tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: 'macro' });
				this.tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: 'macro' });
			}
		} else {
			const colon = line.indexOf(':');
			if (colon === -1) {
				return;
			}

			const head = line.substring(0, colon);
			const nsOpen = head.indexOf('(');
			const nsClose = head.indexOf(')');

			if (nsOpen !== -1 && nsClose !== -1) {
				this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'property' });
				this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
				this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: 'property' });
			} else {
				this.tokens.push({ line: lineIndex, startChar: 0, length: colon, type: 'property' });
				this.tokens.push({ line: lineIndex, startChar: colon, length: 1, type: 'property' });
			}

			const valueStart = colon + 1;
			if (valueStart < line.length) {
				this.tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: 'string' });
			}
		}
	}
}
