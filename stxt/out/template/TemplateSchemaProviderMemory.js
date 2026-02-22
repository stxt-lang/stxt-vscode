"use strict";
// TemplateSchemaProvider.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSchemaProviderMemory = void 0;
const Parser_1 = require("../core/Parser");
const SchemaValidator_1 = require("../schema/SchemaValidator");
const SchemaException_1 = require("../exceptions/SchemaException");
const MetaTemplateSchemaProvider_1 = require("./MetaTemplateSchemaProvider");
const TemplateParser_1 = require("./TemplateParser");
const SchemaProviderMemory_1 = require("../schema/SchemaProviderMemory");
class TemplateSchemaProviderMemory extends SchemaProviderMemory_1.SchemaProviderMemory {
    constructor(parent) {
        if (!parent) {
            parent = new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider();
        }
        super(parent);
    }
    addTemplate(template) {
        const parser = new Parser_1.Parser();
        const nodes = parser.parse(template);
        if (nodes.length !== 1) {
            throw new SchemaException_1.SchemaException("INVALID_SCHEMA", `There are ${nodes.length}, and expected is 1`);
        }
        // Validamos el template contra el meta-schema de templates
        const schemaValidator = new SchemaValidator_1.SchemaValidator(new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider(), true);
        schemaValidator.validate(nodes[0]);
        // Generamos schema desde el template
        const sch = TemplateParser_1.TemplateParser.transformNodeToSchema(nodes[0]);
        // Check mínimo de seguridad (en Java también se controlaba el namespace esperado)
        if (!sch.getNamespace() || sch.getNamespace().trim().length === 0) {
            throw new SchemaException_1.SchemaException("INVALID_SCHEMA", "Schema namespace is empty");
        }
        this.schemas.set(sch.getNamespace(), sch);
    }
}
exports.TemplateSchemaProviderMemory = TemplateSchemaProviderMemory;
//# sourceMappingURL=TemplateSchemaProviderMemory.js.map