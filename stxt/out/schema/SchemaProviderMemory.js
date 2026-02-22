"use strict";
// SchemaProviderMemory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaProviderMemory = void 0;
const Parser_1 = require("../core/Parser");
const StringUtils_1 = require("../core/StringUtils");
const SchemaParser_1 = require("./SchemaParser");
const SchemaProviderMeta_1 = require("./SchemaProviderMeta");
const SchemaValidator_1 = require("./SchemaValidator");
class SchemaProviderMemory {
    parentSchema;
    constructor(parent) {
        if (!parent) {
            this.parentSchema = new SchemaProviderMeta_1.SchemaProviderMeta();
        }
        else {
            this.parentSchema = parent;
        }
    }
    schemas = new Map();
    getSchema(namespace) {
        const key = StringUtils_1.StringUtils.lowerCase(namespace);
        let result = this.schemas.get(key);
        if (!result) {
            result = this.parentSchema.getSchema(namespace);
        }
        return result;
    }
    addSchema(txt) {
        const parser = new Parser_1.Parser();
        const node = parser.parse(txt)[0];
        const schema = SchemaParser_1.SchemaParser.transformNodeToSchema(node);
        const schemaValidator = new SchemaValidator_1.SchemaValidator(new SchemaProviderMeta_1.SchemaProviderMeta(), true);
        schemaValidator.validate(node);
        const key = schema.getNamespace();
        this.schemas.set(key, schema);
    }
    clear() {
        this.schemas.clear();
    }
}
exports.SchemaProviderMemory = SchemaProviderMemory;
//# sourceMappingURL=SchemaProviderMemory.js.map