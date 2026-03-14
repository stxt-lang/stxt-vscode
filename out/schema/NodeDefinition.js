"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeDefinition = void 0;
const ValidationException_1 = require("../exceptions/ValidationException");
const StringUtils_1 = require("../core/StringUtils");
class NodeDefinition {
    name;
    normalizedName;
    type;
    description;
    children = new Map();
    values = new Set();
    normalizedValues = new Map();
    constructor(name, type, line, description) {
        this.name = StringUtils_1.StringUtils.compactSpaces(name);
        this.normalizedName = StringUtils_1.StringUtils.normalize(name);
        this.type = type;
        this.description = description;
        if (this.normalizedName.length === 0) {
            throw new ValidationException_1.ValidationException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
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
    getDescription() {
        return this.description;
    }
    setDescription(description) {
        this.description = description;
    }
    addChildDefinition(childDefinition) {
        const qname = childDefinition.getQualifiedName();
        if (this.children.has(qname)) {
            throw new ValidationException_1.ValidationException(0, "CHILD_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
        }
        this.children.set(qname, childDefinition);
    }
    addValue(value, line) {
        const normalized = StringUtils_1.StringUtils.normalize(value);
        if (this.normalizedValues.has(normalized)) {
            const existing = this.normalizedValues.get(normalized);
            throw new ValidationException_1.ValidationException(line ?? 0, "DUPLICATE_ENUM_VALUE", `Duplicate enum value: '${value}' normalizes to '${normalized}', which is already defined by '${existing}'`);
        }
        this.values.add(value);
        this.normalizedValues.set(normalized, value);
    }
    isAllowedValue(value) {
        if (this.values.size === 0) {
            return true;
        }
        const normalized = StringUtils_1.StringUtils.normalize(value);
        return this.normalizedValues.has(normalized);
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