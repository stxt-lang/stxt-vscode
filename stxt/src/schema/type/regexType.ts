import { Type } from "../Type";
import { Node } from "../../core/Node";
import { NodeDefinition } from "../NodeDefinition";
import { ValidationException } from "../../exceptions/ValidationException";

export function regexType(name: string, pattern: RegExp, error: string): Type {
    return {
        getName: () => name,

        validate(ndef: NodeDefinition, n: Node): void {
            const value = n.getText();
            if (!pattern.test(value)) {
                throw new ValidationException(n.getLine(),"INVALID_VALUE",`${n.getName()}: ${error} (${value})`);
            }
        },
    };
}
