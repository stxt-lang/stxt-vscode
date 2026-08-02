import type { Position as VsPosition, TextDocument } from 'vscode';
import { Position, Uri } from './vscode';

/**
 * `TextDocument` de mentira, con lo poco que consultan los providers: el texto,
 * las líneas y el URI que hace de clave en el caché de `AnalysisDoc`.
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
	 * Como el `lineAt` real: **lanza** si la línea se sale del documento. Se imita a
	 * propósito, porque una excepción aquí es un fallo de verdad de la extensión.
	 */
	lineAt(lineOrPosition: number | Position): TestTextLine {
		const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
		const text = this.lines[lineNumber];

		if (text === undefined) {
			throw new RangeError(`Illegal value for line: ${lineNumber} (el documento tiene ${this.lines.length} líneas)`);
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
 * Puente hacia el tipo real. El `TestDocument` solo implementa la parte del API que
 * consumen los providers, así que el cast se concentra aquí en vez de repetirse en
 * cada test.
 */
export function asTextDocument(document: TestDocument): TextDocument {
	return document as unknown as TextDocument;
}

/** Posición para pasarle a los providers, que esperan la clase real del editor. */
export function asPosition(line: number, character: number): VsPosition {
	return new Position(line, character) as unknown as VsPosition;
}

/** Forma mínima de una edición: sirve tanto para el `TextEdit` real como para el stub. */
export interface LineEdit {
	readonly range: {
		readonly start: { readonly line: number; readonly character: number };
		readonly end: { readonly line: number; readonly character: number };
	};
	readonly newText: string;
}

/**
 * Aplica las ediciones del formateador sobre el texto original.
 *
 * `FormattingProvider` solo emite reemplazos de una línea completa, así que se afirma
 * esa forma en vez de implementar un aplicador genérico de rangos.
 *
 * @param text texto original.
 * @param edits ediciones devueltas por el provider.
 * @returns el texto ya formateado.
 */
export function applyEdits(text: string, edits: readonly LineEdit[]): string {
	const lines = text.split(/\r?\n/);

	for (const edit of edits) {
		const { start, end } = edit.range;

		if (start.line !== end.line) {
			throw new Error(`Se esperaba una edición de una sola línea, y va de la ${start.line} a la ${end.line}.`);
		}

		const line = lines[start.line];
		lines[start.line] = line.slice(0, start.character) + edit.newText + line.slice(end.character);
	}

	return lines.join('\n');
}
