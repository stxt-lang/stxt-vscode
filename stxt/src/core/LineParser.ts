import { Constants } from "./Constants";
import { StringUtils } from "./StringUtils";
import { ParseException } from "../exceptions/ParseException";
import { Line } from "./Line";

export function parseLine(line: string, lastNodeBlock: boolean, lastLevel: number, numLine: number): Line {
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
			return new Line(level, line.substring(pointer + 1), true, false);
		} else {
			// Primer carácter no espacio/tab/comentario => fin de indentación
			break;
		}

		// Dentro del bloque de texto
		if (lastNodeBlock && level > lastLevel) {
			return new Line(level, StringUtils.rightTrim(line.substring(pointer + 1)), false, true);
		}

		// Aumentamos pointer
		pointer++;
	}

	// En este punto ya estamos fuera de bloque de texto (si existía)

	// Empty
	if (pointer === line.length) {
		if (lastNodeBlock) {
			return new Line(level, "", false, true);
		}
		return new Line(level, "", false, false);
	}

	// Indentación no es múltiplo de 4 con espacios
	if (spaces > 0) {
		throw new ParseException(numLine, "INVALID_NUMBER_SPACES", `There are ${spaces} spaces before node`);
	}

	// Validamos level
	if (level > lastLevel + 1) {
		throw new ParseException(numLine, "INDENTATION_LEVEL_NOT_VALID", `Level of indent incorrect: ${level}`);
	}

	// Caso general: devolver la línea sin la indentación consumida
	return new Line(level, line.substring(pointer).trim(), false, false);
}

/**
 * Calcula la indentación de una línea sin validaciones.
 * Útil para el autocomplete y operaciones del editor.
 * 
 * @param line La línea de texto a analizar
 * @returns Objeto con level (nivel de indentación) y length (longitud en caracteres)
 */
export function parseIndentation(line: string): { level: number, length: number } {
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
		} else {
			// Primer carácter no espacio/tab => fin de indentación
			break;
		}

		pointer++;
	}

	return { level, length: pointer };
}
