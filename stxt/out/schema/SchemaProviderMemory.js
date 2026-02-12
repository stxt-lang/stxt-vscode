"use strict";
// SchemaProviderMemory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaProviderMemory = void 0;
const StringUtils_1 = require("../core/StringUtils");
class SchemaProviderMemory {
    schemas = new Map();
    getSchema(namespace) {
        const key = StringUtils_1.StringUtils.lowerCase(namespace);
        return this.schemas.get(key);
    }
    addSchema(schema) {
        const key = schema.getNamespace();
        this.schemas.set(key, schema);
    }
    hasSchema(namespace) {
        const key = StringUtils_1.StringUtils.lowerCase(namespace);
        return this.schemas.has(key);
    }
    getAllNamespaces() {
        return Array.from(this.schemas.keys());
    }
    clear() {
        this.schemas.clear();
    }
}
exports.SchemaProviderMemory = SchemaProviderMemory;
//# sourceMappingURL=SchemaProviderMemory.js.map