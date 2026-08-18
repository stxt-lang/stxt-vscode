import { getAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { InlineNode, StringUtils, type Node } from '@stxt-lang/core';
import { DocumentFormattingEditProvider, FormattingOptions, Range, TextDocument, TextEdit } from 'vscode';

/**
 * Formats a document line by line, the same way `stxt format` of the CLI does: the lines that
 * open a node are rewritten in canonical form, the text lines of a `>>` block — its blank lines
 * included — are re-indented to the level of their block (keeping any indentation of their own
 * beyond it), the whole indentation
 * units of a comment line are converted to the editor's style (STXT-SPEC does not validate the
 * indentation of a comment, so it carries no level: as many whole tabs or 4-space units as the
 * line has are converted, one for one, and whatever follows them is kept), and every other line —
 * blank lines — is left as the author wrote it, minus trailing whitespace. Lines the parse tree
 * does not describe (for instance, after an indentation error) are left untouched.
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
			const newLine = rewriteLine(line, index, unit, analysis);
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
 * @param unit one level of indentation.
 * @param analysis the analysis of the document, or undefined if there is none.
 * @returns the formatted line, identical to `line` when there is nothing to change.
 */
function rewriteLine(line: string, index: number, unit: string, analysis: AnalysisResult | undefined): string {
	const node = analysis?.nodeByLine.get(index);
	if (node) {
		return renderNode(node, line, unit);
	}

	const text = analysis?.textLineByLineNumber.get(index);
	if (text) {
		// A blank line of the block (STXT-SPEC §10.3: "" in the content whatever it looks like in
		// the source, trailing ones included) gets the indentation of the block too, so the block
		// reads as one piece and, at the end of the file, the line is not lost — an empty last
		// line would be indistinguishable from the final line ending.
		const content = analysis?.textContentByLineNumber.get(index) ?? '';
		return unit.repeat(text.getLevel() + 1) + content;
	}

	// A comment: its indentation units are converted to the editor's style, so a document
	// converted between tabs and spaces does not keep its comments in the old style.
	if (analysis?.commentLines.has(index)) {
		return reindentComment(StringUtils.rightTrim(line), unit);
	}

	// A blank line, or a line the parse tree says nothing about: kept as it is.
	return StringUtils.rightTrim(line);
}

/**
 * Converts the indentation units at the start of a comment: every whole unit — a tab or four
 * spaces, in either style — is replaced by `unit`, and the rest of the line, including any
 * remainder of the indentation that is not a whole unit, is kept exactly as it is. This is the
 * rule `stxt format` of the CLI and the playground's re-indentation follow too.
 *
 * @param line the line, without trailing whitespace.
 * @param unit one level of indentation.
 * @returns the line with its indentation units converted.
 */
function reindentComment(line: string, unit: string): string {
	let consumed = 0;
	let units = 0;
	let length = unitAt(line, consumed);
	while (length > 0) {
		consumed += length;
		units++;
		length = unitAt(line, consumed);
	}
	return units === 0 ? line : unit.repeat(units) + line.substring(consumed);
}

/**
 * @param line a line.
 * @param position a position in it.
 * @returns the length of the whole indentation unit — a tab or four spaces — that starts at
 *          `position`, or 0 if none does.
 */
function unitAt(line: string, position: number): number {
	if (line.startsWith(TAB, position)) {
		return TAB.length;
	}
	return line.startsWith(SPACES, position) ? SPACES.length : 0;
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
