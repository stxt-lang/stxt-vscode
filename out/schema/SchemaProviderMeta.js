"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaProviderMeta = void 0;
const Schema_1 = require("./Schema");
const Parser_1 = require("../core/Parser");
const ValidationException_1 = require("../exceptions/ValidationException");
const RuntimeException_1 = require("../exceptions/RuntimeException");
const SchemaParser_1 = require("./SchemaParser");
class SchemaProviderMeta {
    static META_TEXT = `Schema (@stxt.schema): @stxt.schema
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
        Type: ENUM
        Values:
            Value: INLINE
            Value: BLOCK
            Value: TEXT
            Value: BOOLEAN
            Value: URL
            Value: INTEGER
            Value: NATURAL
            Value: NUMBER
            Value: DATE
            Value: TIMESTAMP
            Value: EMAIL
            Value: HEXADECIMAL
            Value: BASE64
            Value: GROUP
            Value: ENUM
    Node: Values
        Children:
            Child: Value
                Min: 1
    Node: Value
`;
    meta;
    constructor() {
        const parser = new Parser_1.Parser();
        const nodes = parser.parse(SchemaProviderMeta.META_TEXT);
        if (nodes.length !== 1) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_INVALID", `Meta schema must produce exactly 1 document, got ${nodes.length}`);
        }
        this.meta = (0, SchemaParser_1.transformNodeToSchema)(nodes[0]);
    }
    getSchema(namespace) {
        if (namespace !== Schema_1.Schema.SCHEMA_NAMESPACE) {
            throw new RuntimeException_1.RuntimeException("RESOURCE_NOT_FOUND", `Not found '${namespace}' in namespace: ${Schema_1.Schema.SCHEMA_NAMESPACE}`);
        }
        if (!this.meta) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
        }
        return this.meta;
    }
}
exports.SchemaProviderMeta = SchemaProviderMeta;
//# sourceMappingURL=SchemaProviderMeta.js.map