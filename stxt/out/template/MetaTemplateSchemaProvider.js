"use strict";
// MetaTemplateSchemaProvider.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaTemplateSchemaProvider = void 0;
const Parser_1 = require("../core/Parser");
const ValidationException_1 = require("../exceptions/ValidationException");
const RuntimeException_1 = require("../exceptions/RuntimeException");
const TemplateParser_1 = require("./TemplateParser");
class MetaTemplateSchemaProvider {
    static META_TEXT = `Template (@stxt.template): @stxt.template
\tStructure >>
\t\tTemplate (@stxt.template):
\t\t\tDescription: (?) TEXT
\t\t\tStructure: (1) BLOCK
`;
    meta;
    constructor() {
        const parser = new Parser_1.Parser();
        const nodes = parser.parse(MetaTemplateSchemaProvider.META_TEXT);
        if (nodes.length !== 1) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_INVALID", `Meta schema must produce exactly 1 document, got ${nodes.length}`);
        }
        this.meta = TemplateParser_1.TemplateParser.transformNodeToSchema(nodes[0]);
    }
    getSchema(namespace) {
        if (namespace !== "@stxt.template") {
            throw new RuntimeException_1.RuntimeException("RESOURCE_NOT_FOUND", `Not found '${namespace}' in namespace: @stxt.template`);
        }
        // meta siempre existe si el constructor terminó, pero lo dejamos equivalente al Java
        if (!this.meta) {
            throw new ValidationException_1.ValidationException(0, "META_SCHEMA_NOT_AVAILABLE", "Meta schema not available");
        }
        return this.meta;
    }
}
exports.MetaTemplateSchemaProvider = MetaTemplateSchemaProvider;
//# sourceMappingURL=MetaTemplateSchemaProvider.js.map