"use strict";
// ChildDefinition.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildDefinition = void 0;
const NamespaceValidator_1 = require("../core/NamespaceValidator");
const ParseException_1 = require("../exceptions/ParseException");
const StringUtils_1 = require("../core/StringUtils");
class ChildDefinition {
    normalizedName;
    name;
    namespace;
    min;
    max;
    constructor(name, namespace, min, max, numLine) {
        this.name = StringUtils_1.StringUtils.compactSpaces(name);
        this.normalizedName = StringUtils_1.StringUtils.normalize(name);
        this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
        this.min = min;
        this.max = max;
        NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, numLine);
        if (this.normalizedName.length === 0) {
            throw new ParseException_1.ParseException(numLine, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
        }
    }
    getName() {
        return this.name;
    }
    getNormalizedName() {
        return this.normalizedName;
    }
    getNamespace() {
        return this.namespace;
    }
    getMin() {
        return this.min;
    }
    getMax() {
        return this.max;
    }
    getQualifiedName() {
        return this.namespace.length === 0
            ? this.normalizedName
            : `${this.namespace}:${this.normalizedName}`;
    }
}
exports.ChildDefinition = ChildDefinition;
//# sourceMappingURL=ChildDefinition.js.map