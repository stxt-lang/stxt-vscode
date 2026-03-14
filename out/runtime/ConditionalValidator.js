"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalValidator = void 0;
// Wrapper del validador que solo valida nodos con namespace
class ConditionalValidator {
    schemaValidator;
    constructor(schemaValidator) {
        this.schemaValidator = schemaValidator;
    }
    validate(node) {
        // Solo validar si tiene namespace
        if (node.getNamespace() !== "") {
            return this.schemaValidator.validate(node);
        }
        return [];
    }
}
exports.ConditionalValidator = ConditionalValidator;
//# sourceMappingURL=ConditionalValidator.js.map