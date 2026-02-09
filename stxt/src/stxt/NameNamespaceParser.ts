// NameNamespaceParser.ts

import { ParseException } from "./ParseException";
import { NameNamespace } from "./NameNamespace";

export class NameNamespaceParser {
	private constructor() {
	}

	static parse(rawName: string | null | undefined, inheritedNs: string | null | undefined, lineNumber: number, fullLine: string): NameNamespace {
		if (rawName == null) {
			throw new ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${fullLine}`);
		}

		rawName = rawName.trim();

		const indexInicio = rawName.indexOf("(");
		const indexFin = rawName.indexOf(")");

		let name: string;
		let namespace: string = inheritedNs ?? "";

		// Encontrados los dos
		if (indexInicio !== -1 && indexFin !== -1) {
			if (indexInicio > indexFin || indexFin !== rawName.length - 1) {
				throw new ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
			}

			name = rawName.substring(0, indexInicio).trim();
			namespace = rawName.substring(indexInicio + 1, indexFin).trim();

			if (namespace.length === 0) {
				throw new ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
			}
		}
		// Ninguno de los dos
		else if (indexInicio === -1 && indexFin === -1) {
			name = rawName;
		}
		// Solo uno de los dos
		else {
			throw new ParseException(lineNumber,"INVALID_NAMESPACE",`Line not valid: ${fullLine}`);
		}

		// Retorno
		return new NameNamespace(name, namespace.toLowerCase());
	}
}
