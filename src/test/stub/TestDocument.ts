import type { Position as VsPosition, TextDocument } from 'vscode';
import { Position, Uri } from './vscode';

/**
 * Fake `TextDocument`, with the little the providers consult: the text, the lines
 * and the URI that acts as the key in the `AnalysisDoc` cache.
 */

export interface TestTextLine {
	readonly lineNumber: number;
	readonly text: string;
	readonly isEmptyOrWhitespace: boolean;
	readonly firstNonWhitespaceCharacterIndex: number;
}

export class TestDocument {
	readonly uri: Uri;
	readonly languageId = 'stxt';
	readonly isUntitled = false;
	private readonly lines: string[];

	constructor(filePath: string, private readonly text: string) {
		this.uri = Uri.file(filePath);
		this.lines = text.split(/\r?\n/);
	}

	getText(): string {
		return this.text;
	}

	get lineCount(): number {
		return this.lines.length;
	}

	/**
	 * Like the real `lineAt`: it **throws** if the line is outside the document. Mimicked
	 * on purpose, because an exception here is a genuine failure of the extension.
	 */
	lineAt(lineOrPosition: number | Position): TestTextLine {
		const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
		const text = this.lines[lineNumber];

		if (text === undefined) {
			throw new RangeError(`Illegal value for line: ${lineNumber} (the document has ${this.lines.length} lines)`);
		}

		const firstNonWhitespace = text.search(/\S/);

		return {
			lineNumber,
			text,
			isEmptyOrWhitespace: firstNonWhitespace === -1,
			firstNonWhitespaceCharacterIndex: firstNonWhitespace === -1 ? text.length : firstNonWhitespace
		};
	}
}

/**
 * Bridge to the real type. `TestDocument` only implements the part of the API the
 * providers consume, so the cast is concentrated here instead of being repeated in
 * every test.
 */
export function asTextDocument(document: TestDocument): TextDocument {
	return document as unknown as TextDocument;
}

/** A position to hand to the providers, which expect the real editor class. */
export function asPosition(line: number, character: number): VsPosition {
	return new Position(line, character) as unknown as VsPosition;
}

/** Minimal shape of an edit: works for both the real `TextEdit` and the stub. */
export interface LineEdit {
	readonly range: {
		readonly start: { readonly line: number; readonly character: number };
		readonly end: { readonly line: number; readonly character: number };
	};
	readonly newText: string;
}

/**
 * Applies the formatter's edits to the original text.
 *
 * `FormattingProvider` only emits whole-line replacements, so that shape is asserted
 * instead of implementing a generic range applier.
 *
 * @param text the original text.
 * @param edits the edits returned by the provider.
 * @returns the formatted text.
 */
export function applyEdits(text: string, edits: readonly LineEdit[]): string {
	const lines = text.split(/\r?\n/);

	for (const edit of edits) {
		const { start, end } = edit.range;

		if (start.line !== end.line) {
			throw new Error(`A single-line edit was expected, but it spans lines ${start.line} to ${end.line}.`);
		}

		const line = lines[start.line];
		lines[start.line] = line.slice(0, start.character) + edit.newText + line.slice(end.character);
	}

	return lines.join('\n');
}
