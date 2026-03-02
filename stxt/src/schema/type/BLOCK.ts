import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const BLOCK: Type = {
	getName(): string {
		return "BLOCK";
	},

	validate(ndef: NodeDefinition, n: Node): void {
		if (n.getValue().length > 0) {
			throw new ValidationException(n.getLine(),"NOT_ALLOWED_VALUE",`Not allowed inline text in node ${n.getQualifiedName()}`);
		}
	},
};
