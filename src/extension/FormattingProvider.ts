import { Formatter, IndentStyle } from '@stxt-lang/core';
import { DocumentFormattingEditProvider, FormattingOptions, Range, TextDocument, TextEdit } from 'vscode';

/**
 * Formats a document with `Formatter` of `@stxt-lang/core`, the same formatter `stxt format` of
 * the CLI and the playground use: the lines that open a node are rewritten in canonical form,
 * the text lines of a `>>` block — its blank lines included — are re-indented to the level of
 * their block (keeping any indentation of their own beyond it), and every other line —
 * comments, blank lines, lines the parse tree does not describe because of a syntax error — is
 * kept as the author wrote it, minus trailing whitespace and with its whole indentation units
 * converted to the editor's style. The rules are documented in the core.
 *
 * The indentation follows the editor: tabs, or spaces when the editor inserts spaces. In that
 * case a level is always **four** spaces (STXT-SPEC: an indentation of spaces is a multiple of
 * four), whatever `tabSize` says, so the result is a valid document.
 */
export class StxtFormattingProvider implements DocumentFormattingEditProvider {

	provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): TextEdit[] {
		const style = options.insertSpaces ? IndentStyle.SPACES_4 : IndentStyle.TABS;
		const edits: TextEdit[] = [];

		// The formatter keeps the lines one to one, so the edits are computed line by line: only
		// the lines that change are replaced, which keeps the cursor and the undo history sane.
		const lines = document.getText().split(/\r?\n/);
		const formatted = Formatter.format(document.getText(), style).text.split(/\r?\n/);

		lines.forEach((line, index) => {
			const newLine = formatted[index];
			if (newLine !== line) {
				edits.push(TextEdit.replace(new Range(index, 0, index, line.length), newLine));
			}
		});

		return edits;
	}
}
