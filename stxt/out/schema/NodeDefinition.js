"use strict";
// NodeDefinition.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeDefinition = void 0;
const ParseException_1 = require("../exceptions/ParseException");
const StringUtils_1 = require("../core/StringUtils");
const SchemaException_1 = require("../exceptions/SchemaException");
class NodeDefinition {
    name;
    normalizedName;
    type;
    description;
    children = new Map();
    values = new Set();
    constructor(name, type, line, description) {
        this.name = StringUtils_1.StringUtils.compactSpaces(name);
        this.normalizedName = StringUtils_1.StringUtils.normalize(name);
        this.type = type;
        this.description = description;
        if (this.normalizedName.length === 0) {
            throw new ParseException_1.ParseException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
        }
    }
    getName() {
        return this.name;
    }
    getNormalizedName() {
        return this.normalizedName;
    }
    getType() {
        return this.type;
    }
    getChildren() {
        return this.children;
    }
    addChildDefinition(childDefinition) {
        const qname = childDefinition.getQualifiedName();
        if (this.children.has(qname)) {
            throw new SchemaException_1.SchemaException("CHILD_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
        }
        this.children.set(qname, childDefinition);
    }
    addValue(value) {
        this.values.add(value);
    }
    isAllowedValue(value) {
        if (this.values.size === 0) {
            return true;
        }
        return this.values.has(value);
    }
    getValues() {
        return this.values;
    }
    toJSON() {
        return {
            name: this.getName(),
            normalizedName: this.getNormalizedName(),
            type: this.getType(),
            description: this.description,
            children: Array.from(this.getChildren().values()).map(c => c.toJSON()),
            values: Array.from(this.getValues()),
        };
    }
}
exports.NodeDefinition = NodeDefinition;
//# sourceMappingURL=NodeDefinition.js.map