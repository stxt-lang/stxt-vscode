// SchemaProviderMeta.ts

import { Schema } from "./Schema";
import { SchemaProvider } from "./SchemaProvider";
import { SchemaParser } from "./SchemaParser";
import { Parser } from "../core/Parser";
import { Node } from "../core/Node";
import { SchemaException } from "../exceptions/SchemaException";
import { ResourceNotFoundException } from "../exceptions/ResourceNotFoundException";

export class SchemaProviderMeta implements SchemaProvider {
    private static readonly META_TEXT = `Schema (@stxt.schema): @stxt.schema
    Node: Schema
        Children:
            Child: Description
                Max: 1
            Child: Node
                Min: 1
    Node: Node
        Children:
            Child: Type
                Max: 1
            Child: Children
                Max: 1
            Child: Description
                Max: 1
            Child: Values
                Max: 1
    Node: Children
        Type: GROUP
        Children:
            Child: Child
                Min: 1
    Node: Description
        Type: TEXT
    Node: Child
        Children:
            Child: Min
                Max: 1
            Child: Max
                Max: 1
    Node: Min
        Type: NATURAL
    Node: Max
        Type: NATURAL
    Node: Type
    Node: Values
        Children:
            Child: Value
                Min: 1
    Node: Value
`;

    private readonly meta: Schema;

    constructor() {
        const parser = new Parser();
        const nodes: Node[] = parser.parse(SchemaProviderMeta.META_TEXT);

        if (nodes.length !== 1) {
            throw new SchemaException("META_SCHEMA_INVALID", `Meta schema must produce exactly 1 document, got ${nodes.length}`);
        }

        this.meta = SchemaParser.transformNodeToSchema(nodes[0]);
    }

    getSchema(namespace: string): Schema {
        if (namespace !== Schema.SCHEMA_NAMESPACE) {
            throw new ResourceNotFoundException(Schema.SCHEMA_NAMESPACE, namespace);
        }

        if (!this.meta) {
            throw new SchemaException("META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
        }

        return this.meta;
    }
}
