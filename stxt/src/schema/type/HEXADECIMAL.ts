import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";
import { binaryValue } from "./binaryValue";

export const HEXADECIMAL: Type = {
	getName(): string {
		return "HEXADECIMAL";
	},

	// STXT-SCHEMA-SPEC 9.5: cadena [0-9A-Fa-f]+ (sin prefijo '#' ni longitud par)
	validate(ndef: NodeDefinition, n: Node): void {
		const value = binaryValue(n);

		if (!/^[0-9A-Fa-f]+$/.test(value)) {
			throw new ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid hexadecimal (${value})`);
		}
	},
};
