"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
const NamespaceValidator_1 = require("../core/NamespaceValidator");
const StringUtils_1 = require("../core/StringUtils");
const ParseException_1 = require("../exceptions/ParseException");
class Schema {
    static SCHEMA_NAMESPACE = "@stxt.schema";
    nodes = new Map();
    namespace;
    description;
    constructor(namespace, line, description) {
        this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
        this.description = description;
        NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, line);
    }
    getNodes() {
        return this.nodes;
    }
    getNodeDefinition(name) {
        return this.nodes.get(StringUtils_1.StringUtils.normalize(name));
    }
    addNodeDefinition(nodeDefinition) {
        const qname = nodeDefinition.getNormalizedName();
        if (this.nodes.has(qname)) {
            throw new ParseException_1.ParseException(0, "NODE_DEF_ALREADY_DEFINED", `Exists a previous node definition with: ${qname}`);
        }
        this.nodes.set(qname, nodeDefinition);
    }
    getNamespace() {
        return this.namespace;
    }
    // Dentro de la clase Schema
    toJSON() {
        return {
            namespace: this.namespace,
            nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
        };
    }
    toString() {
        return JSON.stringify(this, null, 2); // pretty print
    }
}
exports.Schema = Schema;
//# sourceMappingURL=Schema.js.map