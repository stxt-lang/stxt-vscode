"use strict";
// TemplateSchemaProvider.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSchemaProvider = void 0;
const Parser_1 = require("../core/Parser");
const SchemaValidator_1 = require("../schema/SchemaValidator");
const SchemaException_1 = require("../exceptions/SchemaException");
const MetaTemplateSchemaProvider_1 = require("./MetaTemplateSchemaProvider");
const TemplateParser_1 = require("./TemplateParser");
const SchemaProviderMemory_1 = require("../schema/SchemaProviderMemory");
class TemplateSchemaProvider extends SchemaProviderMemory_1.SchemaProviderMemory {
    addSchemaFromTemplate(template) {
        // Creamos parser
        const parser = new Parser_1.Parser();
        const nodes = parser.parse(template);
        if (nodes.length !== 1) {
            throw new SchemaException_1.SchemaException("INVALID_SCHEMA", `There are ${nodes.length}, and expected is 1`);
        }
        // Validamos
        const schemaValidator = new SchemaValidator_1.SchemaValidator(new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider(), true);
        schemaValidator.validate(nodes[0]);
        // Obtenemos schema
        const sch = TemplateParser_1.TemplateParser.transformNodeToSchema(nodes[0]);
        this.addSchema(sch);
    }
}
exports.TemplateSchemaProvider = TemplateSchemaProvider;
//# sourceMappingURL=TemplateSchemaProvider.js.map