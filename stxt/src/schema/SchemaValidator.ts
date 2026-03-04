import { Node } from "../core/Node";
import { ValidationException } from "../exceptions/ValidationException";
import { Validator } from "../processors/Validator";

import { SchemaProvider } from "./SchemaProvider";
import { Schema } from "./Schema";
import { NodeDefinition } from "./NodeDefinition";
import { ChildDefinition } from "./ChildDefinition";

import { TypeRegistry } from "./TypeRegistry";
import { Type } from "./Type";

export class SchemaValidator implements Validator {
    private readonly schemaProvider: SchemaProvider;
    private readonly recursiveValidation: boolean;

    constructor(schemaProvider: SchemaProvider, recursive = false) {
        this.schemaProvider = schemaProvider;
        this.recursiveValidation = recursive;
    }

    validate(node: Node): ValidationException[] {
        const errors: ValidationException[] = [];

        // Obtenemos namespace
        const namespace = node.getNamespace();
        const sch = this.schemaProvider.getSchema(namespace);

        if (!sch) {
            errors.push(new ValidationException(node.getLine(),"SCHEMA_NOT_FOUND",`Not found schema: ${namespace}`));
            return errors;
        }

        // Validamos nodo
        errors.push(...this.validateAgainstSchema(node, sch));

        // Validamos children
        if (this.recursiveValidation) {
            for (const n of node.getChildren()){
                errors.push(...this.validate(n));
            }
        }

        return errors;
    }

    validateAgainstSchema(node: Node, sch: Schema): ValidationException[] {
        const errors: ValidationException[] = [];
        const schemaNode = sch.getNodeDefinition(node.getNormalizedName());

        if (!schemaNode) {
            const error = `NOT EXIST NODE ${node.getNormalizedName()} for namespace ${sch.getNamespace()}`;
            errors.push(new ValidationException(node.getLine(), "NODE_NOT_EXIST_IN_SCHEMA", error));
            return errors;
        }

        errors.push(...SchemaValidator.validateValue(schemaNode, node));
        errors.push(...SchemaValidator.validateCount(schemaNode, node));

        return errors;
    }

    private static validateValue(nsNode: NodeDefinition, n: Node): ValidationException[] {
        const errors: ValidationException[] = [];
        const nodeType = nsNode.getType();

        const validator: Type | undefined = TypeRegistry.get(nodeType);
        if (!validator) {
            errors.push(new ValidationException(n.getLine(),"TYPE_NOT_SUPPORTED",`Node type not supported: ${nodeType}`));
            return errors;
        }

        try {
            validator.validate(nsNode, n);
        } catch (e: unknown) {
            if (e instanceof ValidationException) {
                errors.push(e);
            } else if (e instanceof Error) {
                errors.push(new ValidationException(n.getLine(),"VALIDATION_ERROR", e.message));
            } else {
                errors.push(new ValidationException(n.getLine(),"UNKNOWN_VALIDATION_ERROR", String(e)));
            }
        }

        return errors;
    }

    private static validateCount(nsNode: NodeDefinition, node: Node): ValidationException[] {
        const errors: ValidationException[] = [];
        const count = new Map<string, number>();
        const childrenByType = new Map<string, Node[]>();

        for (const child of node.getChildren()) {
            const childName = child.getQualifiedName();
            count.set(childName, (count.get(childName) ?? 0) + 1);
            
            if (!childrenByType.has(childName)) {
                childrenByType.set(childName, []);
            }
            childrenByType.get(childName)!.push(child);
        }

        for (const chNode of nsNode.getChildren().values()) {
            const qname = chNode.getQualifiedName();
            errors.push(...SchemaValidator.validateCountChild(
                chNode, 
                count.get(qname) ?? 0, 
                node,
                childrenByType.get(qname) ?? []
            ));
        }

        return errors;
    }

    private static validateCountChild(chNode: ChildDefinition, num: number, node: Node, children: Node[]): ValidationException[] {
        const errors: ValidationException[] = [];
        const min = chNode.getMin(); // number | null
        const max = chNode.getMax(); // number | null

        if (min !== null && num < min) {
            errors.push(new ValidationException(node.getLine(),"INVALID_NUMBER",`${num} nodes of '${chNode.getQualifiedName()}' and min is ${min}`));
        }

        if (max !== null && num > max) {
            // Mostrar error en cada nodo hijo que excede el máximo permitido
            for (const child of children) {
                errors.push(new ValidationException(
                    child.getLine(),
                    "INVALID_NUMBER",
                    `Too many '${chNode.getQualifiedName()}' nodes: found ${num}, max is ${max}`
                ));
            }
        }

        return errors;
    }
}
