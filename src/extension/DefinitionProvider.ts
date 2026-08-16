import * as vscode from 'vscode';
import { InlineNode, Node, Parser, StringUtils, TextNode } from '@stxt-lang/core';
import { getAnalysis } from './AnalysisDoc';
import { getDefinitionForDocument } from './SchemaLoader';
import { log } from './Log';

const SCHEMA_NAMESPACE = '@stxt.schema';
const TEMPLATE_NAMESPACE = '@stxt.template';

/**
 * "Go to definition" over a node: opens the schema or template that defines its namespace,
 * placed on the line that declares the node — `Node: Name` in a schema, the node's own line
 * inside `Structure >>` in a template. Over the namespace itself it opens the root of the
 * definition document.
 *
 * Which file defines the namespace is answered by the discovery layer (`SchemaLoader`), per
 * document; the line is found by parsing that file with the core parser, because the compiled
 * schema does not keep source positions.
 */
export class StxtDefinitionProvider implements vscode.DefinitionProvider {

	async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location | undefined> {
		const analysis = getAnalysis(document);
		const node = analysis?.nodeByLine.get(position.line);

		if (!analysis || !node) {
			return undefined;
		}

		// Only the head of the line (name, namespace, separator) is a reference; the value is not.
		const headTokens = analysis.tokens.filter(token => token.line === position.line && token.type !== 'string');
		const headEnd = Math.max(...headTokens.map(token => token.startChar + token.length));

		if (headTokens.length === 0 || position.character > headEnd) {
			return undefined;
		}

		const namespace = node.getNamespace();

		if (!namespace) {
			return undefined;
		}

		const location = getDefinitionForDocument(document.uri, namespace);

		if (!location) {
			log.trace(`No definition file for ${namespace}.`);
			return undefined;
		}

		const onNamespace = headTokens.some(token => token.type === 'namespace'
			&& position.character >= token.startChar && position.character <= token.startChar + token.length);

		const text = new TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(location.uri));
		const line = onNamespace ? rootLine(text) : definitionLine(text, node.getName(), namespace);

		log.trace(`Definition of ${node.getQualifiedName()}: ${location.uri.toString()}:${line + 1}.`);
		return new vscode.Location(location.uri, new vscode.Position(line, 0));
	}
}

// Parses a definition file; a definition that does not parse just yields no roots.
function rootsOf(text: string): Node[] {
	try {
		return new Parser().parseResult(text).getNodes();
	} catch {
		return [];
	}
}

/** Zero-based line of the first root of the definition document (0 if there is none). */
function rootLine(text: string): number {
	const roots = rootsOf(text);
	return roots.length > 0 ? Math.max(0, roots[0].getLine() - 1) : 0;
}

/**
 * Zero-based line where a definition document declares a node, or the line of the
 * document root when it cannot be located.
 *
 * @param text the text of the schema or template.
 * @param nodeName the name of the node whose declaration is wanted.
 * @param namespace the namespace of the node, to tell apart same-named nodes in a template.
 * @returns the zero-based line.
 */
export function definitionLine(text: string, nodeName: string, namespace: string): number {
	const roots = rootsOf(text);
	const wanted = StringUtils.normalize(nodeName);

	for (const root of roots) {
		if (!(root instanceof InlineNode)) {
			continue;
		}

		if (root.getNamespace() === SCHEMA_NAMESPACE) {
			// `Node: Name` children of the schema root.
			for (const child of root.getChildren()) {
				if (child instanceof InlineNode && child.getCanonicalName() === 'node'
					&& StringUtils.normalize(child.getValue()) === wanted) {
					return child.getLine() - 1;
				}
			}
		} else if (root.getNamespace() === TEMPLATE_NAMESPACE) {
			// The `Structure >>` block is STXT itself: its inner lines are absolute lines of
			// the file offset by the line of the `Structure` header (same rule as the tokens
			// of `TokenGeneratorObserver`).
			for (const child of root.getChildren()) {
				if (child instanceof TextNode && child.getCanonicalName() === 'structure') {
					const inner = findNode(rootsOf(child.getText()), wanted, namespace);

					if (inner) {
						return child.getLine() + inner.getLine() - 1;
					}
				}
			}
		}
	}

	return roots.length > 0 ? Math.max(0, roots[0].getLine() - 1) : 0;
}

// Depth-first search of a node by canonical name, preferring a match in the same namespace.
function findNode(nodes: ReadonlyArray<Node>, canonicalName: string, namespace: string): Node | undefined {
	const target = StringUtils.lowerCase(namespace);
	let byNameOnly: Node | undefined;

	const walk = (list: ReadonlyArray<Node>): Node | undefined => {
		for (const node of list) {
			if (node.getCanonicalName() === canonicalName) {
				if (StringUtils.lowerCase(node.getNamespace()) === target) {
					return node;
				}
				byNameOnly ??= node;
			}
			if (node instanceof InlineNode) {
				const found = walk(node.getChildren());
				if (found) {
					return found;
				}
			}
		}
		return undefined;
	};

	return walk(nodes) ?? byNameOnly;
}
