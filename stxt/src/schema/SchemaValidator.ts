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

    validate(node: Node): void {
        // Obtenemos namespace
        const namespace = node.getNamespace();
        const sch = this.schemaProvider.getSchema(namespace);

        if (!sch) {
            throw new ValidationException(
                node.getLine(),
                "SCHEMA_NOT_FOUND",
                `Not found schema: ${namespace}`
            );
        }

        // Validamos nodo
        this.validateAgainstSchema(node, sch);

        // Validamos children
        if (this.recursiveValidation) {
            for (const n of node.getChildren()) this.validate(n);
        }
    }

    validateAgainstSchema(node: Node, sch: Schema): void {
        const schemaNode = sch.getNodeDefinition(node.getNormalizedName());

        if (!schemaNode) {
            const error = `NOT EXIST NODE ${node.getNormalizedName()} for namespace ${sch.getNamespace()}`;
            throw new ValidationException(node.getLine(), "NODE_NOT_EXIST_IN_SCHEMA", error);
        }

        SchemaValidator.validateValue(schemaNode, node);
        SchemaValidator.validateCount(schemaNode, node);
    }

    private static validateValue(nsNode: NodeDefinition, n: Node): void {
        const nodeType = nsNode.getType();

        const validator: Type | undefined = TypeRegistry.get(nodeType);
        if (!validator) {
            throw new ValidationException(
                n.getLine(),
                "TYPE_NOT_SUPPORTED",
                `Node type not supported: ${nodeType}`
            );
        }

        validator.validate(nsNode, n);
    }

    private static validateCount(nsNode: NodeDefinition, node: Node): void {
        const count = new Map<string, number>();

        for (const child of node.getChildren()) {
            const childName = child.getQualifiedName();
            count.set(childName, (count.get(childName) ?? 0) + 1);
        }

        for (const chNode of nsNode.getChildren().values()) {
            SchemaValidator.validateCountChild(chNode, count.get(chNode.getQualifiedName()) ?? 0, node);
        }
    }

    private static validateCountChild(chNode: ChildDefinition, num: number, node: Node): void {
        const min = chNode.getMin(); // number | null
        const max = chNode.getMax(); // number | null

        if (min != null && num < min) {
            throw new ValidationException(
                node.getLine(),
                "INVALID_NUMBER",
                `${num} nodes of '${chNode.getQualifiedName()}' and min is ${min}`
            );
        }

        if (max != null && num > max) {
            throw new ValidationException(
                node.getLine(),
                "INVALID_NUMBER",
                `${num} nodes of '${chNode.getQualifiedName()}' and max is ${max}`
            );
        }
    }
}
