"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedSchemaProvider = void 0;
const Parser_1 = require("../core/Parser");
const StringUtils_1 = require("../core/StringUtils");
const SchemaProviderMeta_1 = require("../schema/SchemaProviderMeta");
const SchemaParser_1 = require("../schema/SchemaParser");
const SchemaValidator_1 = require("../schema/SchemaValidator");
const MetaTemplateSchemaProvider_1 = require("../template/MetaTemplateSchemaProvider");
const TemplateParser_1 = require("../template/TemplateParser");
/**
 * Provider unificado que maneja tanto schemas como templates.
 * Detecta automáticamente el tipo según el namespace del nodo raíz:
 * - @stxt.template => procesa como template
 * - @stxt.schema => procesa como schema
 * - otros => no hace nada
 */
class UnifiedSchemaProvider {
    schemas = new Map();
    schemaMeta;
    templateMeta;
    constructor() {
        this.schemaMeta = new SchemaProviderMeta_1.SchemaProviderMeta();
        this.templateMeta = new MetaTemplateSchemaProvider_1.MetaTemplateSchemaProvider();
    }
    getSchema(namespace) {
        const key = StringUtils_1.StringUtils.lowerCase(namespace);
        if (namespace === "@stxt.template") {
            return this.templateMeta.getSchema(key);
        }
        else if (namespace === "@stxt.schema") {
            return this.schemaMeta.getSchema(key);
        }
        let result = this.schemas.get(key);
        return result;
    }
    addFile(text) {
        const parser = new Parser_1.Parser();
        const nodes = parser.parse(text);
        for (const node of nodes) {
            const namespace = node.getNamespace();
            if (namespace === "@stxt.template") {
                this.addTemplateNode(node);
            }
            else if (namespace === "@stxt.schema") {
                this.addSchemaNode(node);
            }
        }
    }
    addTemplateNode(node) {
        // Validar contra el meta-schema de templates
        const schemaValidator = new SchemaValidator_1.SchemaValidator(this.templateMeta, true);
        schemaValidator.validate(node);
        // Transformar el template a schema
        const schema = (0, TemplateParser_1.transformTemplateNodeToSchema)(node);
        const key = StringUtils_1.StringUtils.lowerCase(schema.getNamespace());
        this.schemas.set(key, schema);
    }
    addSchemaNode(node) {
        // Validar contra el meta-schema de schemas
        const schemaValidator = new SchemaValidator_1.SchemaValidator(this.schemaMeta, true);
        schemaValidator.validate(node);
        // Transformar el nodo a schema
        const schema = (0, SchemaParser_1.transformNodeToSchema)(node);
        const key = StringUtils_1.StringUtils.lowerCase(schema.getNamespace());
        this.schemas.set(key, schema);
    }
    clear() {
        this.schemas.clear();
    }
    getAllSchemas() {
        return Array.from(this.schemas.values());
    }
}
exports.UnifiedSchemaProvider = UnifiedSchemaProvider;
//# sourceMappingURL=UnifiedSchemaProvider.js.map