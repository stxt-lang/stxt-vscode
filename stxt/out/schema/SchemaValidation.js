"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
const ValidationException_1 = require("../exceptions/ValidationException");
const TypeRegistry_1 = require("../schema/TypeRegistry");
class SchemaValidator {
    schemaProvider;
    recursiveValidation;
    constructor(schemaProvider, recursive = false) {
        this.schemaProvider = schemaProvider;
        this.recursiveValidation = recursive;
    }
    validate(node) {
        // Obtenemos namespace
        const namespace = node.getNamespace();
        const sch = this.schemaProvider.getSchema(namespace);
        if (!sch) {
            throw new ValidationException_1.ValidationException(node.getLine(), "SCHEMA_NOT_FOUND", `Not found schema: ${namespace}`);
        }
        // Validamos nodo
        this.validateAgainstSchema(node, sch);
        // Validamos children
        if (this.recursiveValidation) {
            for (const n of node.getChildren())
                this.validate(n);
        }
    }
    validateAgainstSchema(node, sch) {
        const schemaNode = sch.getNodeDefinition(node.getNormalizedName());
        if (!schemaNode) {
            const error = `NOT EXIST NODE ${node.getNormalizedName()} for namespace ${sch.getNamespace()}`;
            throw new ValidationException_1.ValidationException(node.getLine(), "NODE_NOT_EXIST_IN_SCHEMA", error);
        }
        SchemaValidator.validateValue(schemaNode, node);
        SchemaValidator.validateCount(schemaNode, node);
    }
    static validateValue(nsNode, n) {
        const nodeType = nsNode.getType();
        const validator = TypeRegistry_1.TypeRegistry.get(nodeType);
        if (!validator) {
            throw new ValidationException_1.ValidationException(n.getLine(), "TYPE_NOT_SUPPORTED", `Node type not supported: ${nodeType}`);
        }
        validator.validate(nsNode, n);
    }
    static validateCount(nsNode, node) {
        const count = new Map();
        for (const child of node.getChildren()) {
            const childName = child.getQualifiedName();
            count.set(childName, (count.get(childName) ?? 0) + 1);
        }
        for (const chNode of nsNode.getChildren().values()) {
            SchemaValidator.validateCountChild(chNode, count.get(chNode.getQualifiedName()) ?? 0, node);
        }
    }
    static validateCountChild(chNode, num, node) {
        const min = chNode.getMin(); // number | null
        const max = chNode.getMax(); // number | null
        if (min != null && num < min) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${num} nodes of '${chNode.getQualifiedName()}' and min is ${min}`);
        }
        if (max != null && num > max) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${num} nodes of '${chNode.getQualifiedName()}' and max is ${max}`);
        }
    }
}
exports.SchemaValidator = SchemaValidator;
//# sourceMappingURL=SchemaValidation.js.map