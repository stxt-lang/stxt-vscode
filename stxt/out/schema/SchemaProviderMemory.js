"use strict";
// SchemaProviderMemory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaProviderMemory = void 0;
const StringUtils_1 = require("../core/StringUtils");
class SchemaProviderMemory {
    parentSchema;
    constructor(parent) {
        this.parentSchema = parent;
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
    addSchema(schema) {
        const key = schema.getNamespace();
        this.schemas.set(key, schema);
    }
    clear() {
        this.schemas.clear();
    }
}
exports.SchemaProviderMemory = SchemaProviderMemory;
//# sourceMappingURL=SchemaProviderMemory.js.map