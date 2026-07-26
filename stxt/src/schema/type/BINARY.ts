import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";
import { StringUtils } from "../../core/StringUtils";

export const BINARY: Type = {
	getName(): string {
		return "BINARY";
	},

	// En forma BLOCK se valida la concatenación de líneas ignorando
	// saltos de línea y espacios (STXT-SCHEMA-SPEC 9.5)
	validate(ndef: NodeDefinition, n: Node): void {
		const value = StringUtils.cleanSpaces(n.getText());

		if (!/^[01]+$/.test(value)) {
			throw new ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid binary (${value})`);
		}
	},
};
