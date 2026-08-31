import { getAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { Constants, InlineNode, parseLine } from '@stxt-lang/core';
import { findSuggestionsByParent, findRootLevelSuggestions, findEnumValues } from './CompletionProviderSearch';
import { CompletionItem, CompletionItemProvider, Position, ProviderResult, TextDocument } from 'vscode';
import { log } from './Log';

export class StxtCompletionProvider implements CompletionItemProvider {

	provideCompletionItems(document: TextDocument, position: Position): ProviderResult<CompletionItem[]> {

		const linePrefix = document.lineAt(position).text.slice(0, position.character);

		log.trace(`Completion at line ${position.line}.`);

		// Without an analysis there is nothing to show
		const lastAnalysis: AnalysisResult | undefined = getAnalysis(document);
		if (!lastAnalysis) {
			return [];
		}

		// Find the previous node to obtain lastLevel and lastNodeBlock
		const lastNode = getLastNode(lastAnalysis, position.line);
		const lastLevel = lastNode ? lastNode.getLevel() : 0;
		const lastNodeBlock = lastNode ? lastNode.isTextNode() : false;

		const completionContext = getCompletionContext(linePrefix, lastNodeBlock, lastLevel);
		if (!completionContext) {
			return [];
		}

		if (completionContext.isValue) {
			const nodeAtLine = lastAnalysis.nodeByLine.get(position.line);
			if (nodeAtLine) {
				return findEnumValues(nodeAtLine, completionContext.prefix);
			}
			return [];
		}

		// Find the cursor level
		const level = completionContext.level;
		log.trace(`Cursor level: ${level}.`);

		if (level === 0) {
			return findRootLevelSuggestions(completionContext.prefix);
		}

		// Find the parent
		const parent = getParentNode(lastAnalysis, position.line, level);
		if (parent) {
			log.trace(`Parent node: ${parent.getQualifiedName()} (line ${parent.getLine()}).`);
			return findSuggestionsByParent(parent, completionContext.prefix);
		}

		return [];
	}
}

/**
 * Finds the first node before the given line.
 */
function getLastNode(analysis: AnalysisResult, currentLine: number) {
	let searchLine = currentLine;
	while (searchLine > 0) {
		searchLine = searchLine - 1;
		const nodeAtLine = analysis.nodeByLine.get(searchLine);
		if (nodeAtLine) {
			return nodeAtLine;
		}
	}
	return null;
}

/**
 * Finds the parent node (level-1) before the given line.
 *
 * Only an inline node can have children: if the closest node one level up is a text block,
 * the cursor is inside its text and there is nothing to suggest.
 */
function getParentNode(analysis: AnalysisResult, currentLine: number, level: number): InlineNode | null {
	let parentLine = currentLine;
	while (parentLine > 0) {
		parentLine = parentLine - 1;
		const nodeAtLine = analysis.nodeByLine.get(parentLine);
		if (nodeAtLine?.getLevel() === level - 1) {
			return nodeAtLine instanceof InlineNode ? nodeAtLine : null;
		}
	}
	return null;
}

function getCompletionContext(linePrefix: string, lastNodeBlock: boolean, lastLevel: number): { level: number, prefix: string, isValue: boolean } | null {
	const trimmed = linePrefix.trimStart();
	if (trimmed.startsWith(Constants.COMMENT_CHAR)) {
		return null;
	}

	const line = parseLine(linePrefix, lastNodeBlock, lastLevel, 0, false);
	const level = line.level;
	const indentationLength = line.contentStart;

	// Detect whether we are completing a value (after ':' or '>>')
	const sepIndex = trimmed.indexOf(Constants.SEP_NODE);
	const textSepIndex = trimmed.indexOf(Constants.SEP_TEXT_NODE);
	
	if (sepIndex !== -1) {
		// We are after ':', completing an inline value
		const valuePrefix = trimmed.substring(sepIndex + 1).trimStart();
		return { level, prefix: valuePrefix, isValue: true };
	}
	
	if (textSepIndex !== -1) {
		// We are after '>>': that is a text node, no completion offered
		return null;
	}

	// We are completing a node name
	const rawNodePrefix = linePrefix.slice(indentationLength);
	const prefix = rawNodePrefix.replace(/\s*\(.*$/, '').trimEnd();

	return { level, prefix, isValue: false };
}


