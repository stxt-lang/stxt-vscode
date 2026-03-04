"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
const ValidationException_1 = require("../exceptions/ValidationException");
const TypeRegistry_1 = require("./TypeRegistry");
class SchemaValidator {
    schemaProvider;
    recursiveValidation;
    constructor(schemaProvider, recursive = false) {
        this.schemaProvider = schemaProvider;
        this.recursiveValidation = recursive;
    }
    validate(node) {
        const errors = [];
        // Obtenemos namespace
        const namespace = node.getNamespace();
        const sch = this.schemaProvider.getSchema(namespace);
        if (!sch) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "SCHEMA_NOT_FOUND", `Not found schema: ${namespace}`));
            return errors;
        }
        // Validamos nodo
        errors.push(...this.validateAgainstSchema(node, sch));
        // Validamos children
        if (this.recursiveValidation) {
            for (const n of node.getChildren()) {
                errors.push(...this.validate(n));
            }
        }
        return errors;
    }
    validateAgainstSchema(node, sch) {
        const errors = [];
        const schemaNode = sch.getNodeDefinition(node.getNormalizedName());
        if (!schemaNode) {
            const error = `NOT EXIST NODE ${node.getNormalizedName()} for namespace ${sch.getNamespace()}`;
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "NODE_NOT_EXIST_IN_SCHEMA", error));
            return errors;
        }
        errors.push(...SchemaValidator.validateValue(schemaNode, node));
        errors.push(...SchemaValidator.validateCount(schemaNode, node));
        return errors;
    }
    static validateValue(nsNode, n) {
        const errors = [];
        const nodeType = nsNode.getType();
        const validator = TypeRegistry_1.TypeRegistry.get(nodeType);
        if (!validator) {
            errors.push(new ValidationException_1.ValidationException(n.getLine(), "TYPE_NOT_SUPPORTED", `Node type not supported: ${nodeType}`));
            return errors;
        }
        try {
            validator.validate(nsNode, n);
        }
        catch (e) {
            if (e instanceof ValidationException_1.ValidationException) {
                errors.push(e);
            }
            else if (e instanceof Error) {
                errors.push(new ValidationException_1.ValidationException(n.getLine(), "VALIDATION_ERROR", e.message));
            }
            else {
                errors.push(new ValidationException_1.ValidationException(n.getLine(), "UNKNOWN_VALIDATION_ERROR", String(e)));
            }
        }
        return errors;
    }
    static validateCount(nsNode, node) {
        const errors = [];
        const count = new Map();
        const childrenByType = new Map();
        for (const child of node.getChildren()) {
            const childName = child.getQualifiedName();
            count.set(childName, (count.get(childName) ?? 0) + 1);
            if (!childrenByType.has(childName)) {
                childrenByType.set(childName, []);
            }
            childrenByType.get(childName).push(child);
        }
        for (const chNode of nsNode.getChildren().values()) {
            const qname = chNode.getQualifiedName();
            errors.push(...SchemaValidator.validateCountChild(chNode, count.get(qname) ?? 0, node, childrenByType.get(qname) ?? []));
        }
        return errors;
    }
    static validateCountChild(chNode, num, node, children) {
        const errors = [];
        const min = chNode.getMin(); // number | null
        const max = chNode.getMax(); // number | null
        if (min !== null && num < min) {
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${num} nodes of '${chNode.getQualifiedName()}' and min is ${min}`));
        }
        if (max !== null && num > max) {
            // Error en el parent
            errors.push(new ValidationException_1.ValidationException(node.getLine(), "INVALID_NUMBER", `${num} nodes of '${chNode.getQualifiedName()}' and max is ${max}`));
            // Error en cada nodo hijo que excede el máximo permitido
            for (const child of children) {
                errors.push(new ValidationException_1.ValidationException(child.getLine(), "INVALID_NUMBER", `Too many '${chNode.getQualifiedName()}' nodes: found ${num}, max is ${max}`));
            }
        }
        return errors;
    }
}
exports.SchemaValidator = SchemaValidator;
//# sourceMappingURL=SchemaValidator.js.map