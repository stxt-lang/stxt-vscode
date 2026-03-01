// type/ENUM.ts

import { Node } from "../../core/Node";
import { ParseException } from "../../exceptions/ParseException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

export const ENUM: Type = {
    getName(): string {
        return "ENUM";
    },

    validate(ndef: NodeDefinition, n: Node): void {
        if (n.getTextLines().length > 0) {
            throw new ParseException(
                n.getLine(),
                "NOT_ALLOWED_TEXT",
                `Not allowed text in node ${n.getQualifiedName()}`
            );
        }

        const value = n.getValue();
        const allowed = ndef.getValues(); // ReadonlySet<string>

        if (!allowed.has(value)) {
            throw new ParseException(
                n.getLine(),
                "INVALID_VALUE",
                `The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`
            );
        }
    },
};
