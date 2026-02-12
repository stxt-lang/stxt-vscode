// type/RegexValue.ts

import { Node } from "../../core/Node";
import { ValidationException } from "../../exceptions/ValidationException";
import { NodeDefinition } from "../NodeDefinition";
import { Type } from "../Type";

/**
 * Base validator for simple regex-based value checks.
 */
export abstract class RegexValue implements Type {
    private readonly pattern: RegExp;
    private readonly error: string;

    protected constructor(pattern: RegExp, error: string) {
        this.pattern = pattern;
        this.error = error;
    }

    abstract getName(): string;

    validate(ndef: NodeDefinition, n: Node): void {
        const value = n.getText();

        if (!this.pattern.test(value)) {
            throw new ValidationException(
                n.getLine(),
                "INVALID_VALUE",
                `${n.getName()}: ${this.error} (${value})`
            );
        }
    }
}
