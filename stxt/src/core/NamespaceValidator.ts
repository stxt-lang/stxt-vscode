// NamespaceValidator.ts

import { ParseException } from "./ParseException";

export class NamespaceValidator {
	/**
	 * Valida el namespace lógico.
	 *
	 * Reglas:
	 * - Solo minúsculas, dígitos y punto.
	 * - Puede empezar opcionalmente por '@'.
	 * - Debe ser una o varias etiquetas estilo dominio separadas por '.':
	 *   etiqueta := [a-z0-9]+
	 * ejemplos válidos: "xxx", "xxx.ddd", "zzz.ttt.ooo", "@xxx", "@xxx.ddd".
	 */
	private static readonly NAMESPACE_FORMAT: RegExp = /^@?[a-z0-9]+(\.[a-z0-9]+)+$/;

	static validateNamespaceFormat(namespace: string | null | undefined, lineNumber: number): void {
		if (namespace == null || namespace.length === 0) {
			return;
		}

		if (!NamespaceValidator.NAMESPACE_FORMAT.test(namespace)) {
			throw new ParseException(lineNumber, "INVALID_NAMESPACE", `Namespace not valid: ${namespace}`);
		}
	}
}
