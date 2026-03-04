import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const ENUM: Type = {
    getName(): string {
        return "ENUM";
    },

    validate(ndef: NodeDefinition, n: Node): void {
        if (n.getTextLines().length > 0) {
            throw new ValidationException(n.getLine(),"NOT_ALLOWED_TEXT",`Not allowed text in node ${n.getQualifiedName()}`);
        }

        const value = n.getValue();
        const allowed = ndef.getValues(); // ReadonlySet<string>

        if (!ndef.isAllowedValue(value)) {
            throw new ValidationException(n.getLine(),"INVALID_VALUE",`The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`);
        }
    },
};
