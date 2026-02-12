// type/INLINE.ts

import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";
import { Node } from "../../core/Node";

export const INLINE: Type = {
    getName(): string {
        return "INLINE";
    },

    validate(ndef: NodeDefinition, n: Node): void {
        if (n.getTextLines().length > 0) {
            throw new ValidationException(
                n.getLine(),
                "NOT_ALLOWED_TEXT",
                `Not allowed text in node ${n.getQualifiedName()}`
            );
        }
    },
};
