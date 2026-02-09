// LineIndentParser.ts

import { Constants } from "./Constants";
import { rightTrim } from "./StringUtils";
import { ParseException } from "./ParseException";
import { LineIndent } from "./LineIndent";

export class LineIndentParser {
	private constructor() {
		// Evita instanciación (clase "utility" como en Java)
	}

	static parseLine(
		line: string,
		lastNodeBlock: boolean,
		lastLevel: number,
		numLine: number
	): LineIndent | null {
		let level = 0;
		let spaces = 0;
		let pointer = 0;

		while (pointer < line.length) {
			const c = line.charAt(pointer);

			if (c === Constants.SPACE) {
				spaces++;
				if (spaces === Constants.TAB_SPACES) {
					level++;
					spaces = 0;
				}
			} else if (c === Constants.TAB) {
				level++;
				spaces = 0;
			} else if (c === Constants.COMMENT_CHAR) {
				return null;
			} else {
				// Primer carácter no espacio/tab/comentario => fin de indentación
				break;
			}

			pointer++;

			// Dentro del bloque de texto
			if (lastNodeBlock && level > lastLevel) {
				return new LineIndent(level, rightTrim(line.substring(pointer)));
			}
		}

		// En este punto ya estamos fuera de bloque de texto (si existía)

		// Empty
		if (pointer === line.length) {
			if (lastNodeBlock) {
				return new LineIndent(lastLevel + 1, "");
			}
			return null;
		}

		// Indentación no es múltiplo de 4 con espacios
		if (spaces > 0) {
			throw new ParseException(
				numLine,
				"INVALID_NUMBER_SPACES",
				`There are ${spaces} spaces before node`
			);
		}

		// Validamos level
		if (level > lastLevel + 1) {
			throw new ParseException(
				numLine,
				"INDENTATION_LEVEL_NOT_VALID",
				`Level of indent incorrect: ${level}`
			);
		}

		// Caso general: devolver la línea sin la indentación consumida
		return new LineIndent(level, line.substring(pointer).trim());
	}
}
