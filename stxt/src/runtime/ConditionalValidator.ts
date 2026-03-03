import { Node } from "../core/Node";
import { Validator } from "../processors/Validator";
import { SchemaValidator } from "../schema/SchemaValidator";

// Wrapper del validador que solo valida nodos con namespace
export class ConditionalValidator implements Validator {
    private readonly schemaValidator: SchemaValidator;

    constructor(schemaValidator: SchemaValidator) {
        this.schemaValidator = schemaValidator;
    }

    validate(node: Node): void {
        // Solo validar si tiene namespace
        if (node.getNamespace() !== "") {
            this.schemaValidator.validate(node);
        }
    }
}

