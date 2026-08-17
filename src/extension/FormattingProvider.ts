import { getAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { InlineNode, StringUtils, type Node } from '@stxt-lang/core';
import { DocumentFormattingEditProvider, FormattingOptions, Range, TextDocument, TextEdit } from 'vscode';

/**
 * Formats a document line by line, the same way `stxt format` of the CLI does: the lines that
 * open a node are rewritten in canonical form, the text lines of a `>>` block are re-indented to
 * the level of their block (keeping any indentation of their own beyond it), and every other line
 * — comments, blank lines — is left as the author wrote it, minus trailing whitespace. Lines the
 * parse tree does not describe (for instance, after an indentation error) are left untouched.
 *
 * The indentation follows the editor: tabs, or spaces when the editor inserts spaces. In that
 * case a level is always **four** spaces (STXT-SPEC: an indentation of spaces is a multiple of
 * four), whatever `tabSize` says, so the result is a valid document.
 */
export class StxtFormattingProvider implements DocumentFormattingEditProvider {

	provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): TextEdit[] {
		const analysis = getAnalysis(document);
		const unit = options.insertSpaces ? SPACES : TAB;
		const edits: TextEdit[] = [];

		const lines = document.getText().split(/\r?\n/);

		lines.forEach((line, index) => {
			const newLine = rewriteLine(line, index, lines.length, unit, analysis);
			if (newLine !== line) {
				edits.push(TextEdit.replace(new Range(index, 0, index, line.length), newLine));
			}
		});

		return edits;
	}
}

/** One level of indentation, with tabs. */
const TAB = '\t';
/** One level of indentation, with spaces: always four (STXT-SPEC), whatever the editor's tab size. */
const SPACES = '    ';

/**
 * Rewrites one line of the document.
 *
 * @param line the line, without its line ending.
 * @param index its 0-based index.
 * @param lineCount how many lines the document has.
 * @param unit one level of indentation.
 * @param analysis the analysis of the document, or undefined if there is none.
 * @returns the formatted line, identical to `line` when there is nothing to change.
 */
function rewriteLine(line: string, index: number, lineCount: number, unit: string, analysis: AnalysisResult | undefined): string {
	const node = analysis?.nodeByLine.get(index);
	if (node) {
		return renderNode(node, line, unit);
	}

	const text = analysis?.textLineByLineNumber.get(index);
	if (text) {
		// STXT-SPEC §10.3: the last line of the document, blank but for its indentation and
		// belonging to a text block, is an empty line of the block content. Trimming it would
		// leave "", which at the end of the file is indistinguishable from the final line
		// ending, and the block would lose that line: it is kept as it is.
		if (index === lineCount - 1 && line.trim() === '' && line.length > 0) {
			return line;
		}
		const content = analysis?.textContentByLineNumber.get(index) ?? '';
		return content.length === 0 ? '' : unit.repeat(text.getLevel() + 1) + content;
	}

	// A comment, a blank line, or a line the parse tree says nothing about: kept as it is.
	return StringUtils.rightTrim(line);
}

/**
 * Renders the line that opens a node in its canonical form. The namespace is written only where
 * the source wrote it: repeating the parent's namespace is redundant but legal, and dropping it
 * would be an edit, not a reformat.
 *
 * @param node the node the line opens.
 * @param line the source line, used only to tell whether it spelled the namespace out.
 * @param unit one level of indentation.
 * @returns the formatted line.
 */
function renderNode(node: Node, line: string, unit: string): string {
	const head = node instanceof InlineNode ? line.substring(0, line.indexOf(':')) : line;
	const name = head.includes('(')
		? `${node.getName()} (${node.getNamespace()})`
		: node.getName();

	if (!(node instanceof InlineNode)) {
		return `${unit.repeat(node.getLevel())}${name} >>`;
	}

	// Without a value the space after the colon is not written: container nodes would end up
	// with a stray trailing space.
	const value = node.getValue();
	const separator = value.length > 0 ? `: ${value}` : ':';

	return `${unit.repeat(node.getLevel())}${name}${separator}`;
}
