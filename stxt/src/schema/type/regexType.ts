// type/regexType.ts

import { Type } from "../Type";
import { Node } from "../../core/Node";
import { NodeDefinition } from "../NodeDefinition";
import { ParseException } from "../../exceptions/ParseException";

export function regexType(name: string, pattern: RegExp, error: string): Type {
    return {
        getName: () => name,

        validate(ndef: NodeDefinition, n: Node): void {
            const value = n.getText();
            if (!pattern.test(value)) {
                throw new ParseException(
                    n.getLine(),
                    "INVALID_VALUE",
                    `${n.getName()}: ${error} (${value})`
                );
            }
        },
    };
}
