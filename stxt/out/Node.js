"use strict";
// Node.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const ParseException_1 = require("./ParseException");
const NamespaceValidator_1 = require("./NamespaceValidator");
const StringUtils_1 = require("./StringUtils");
class Node {
    name;
    normalizedName;
    namespace;
    textNode;
    value;
    textLines = [];
    line;
    level;
    children = [];
    isFrozen = false;
    constructor(line, level, name, namespace, textNode, value) {
        this.level = level;
        this.line = line;
        this.name = StringUtils_1.StringUtils.compactSpaces(name);
        this.normalizedName = StringUtils_1.StringUtils.normalize(name);
        this.namespace = StringUtils_1.StringUtils.lowerCase(namespace);
        this.value = (value ?? "").trim();
        this.textNode = textNode;
        NamespaceValidator_1.NamespaceValidator.validateNamespaceFormat(this.namespace, line);
        if (this.value.length > 0 && this.isTextNode()) {
            throw new Error("Not empty value with textNode");
        }
        if (this.normalizedName.length === 0) {
            throw new ParseException_1.ParseException(line, "INVALID_NODE_NAME", `Node name not valid: ${name}`);
        }
    }
    addTextLine(line) {
        this.textLines.push(line);
    }
    getName() {
        return this.name;
    }
    getNormalizedName() {
        return this.normalizedName;
    }
    getQualifiedName() {
        return this.namespace.length === 0
            ? this.normalizedName
            : `${this.namespace}:${this.normalizedName}`;
    }
    getNamespace() {
        return this.namespace;
    }
    getChildren() {
        return this.children;
    }
    addChild(node) {
        if (this.isFrozen) {
            throw new Error("Node is frozen");
        }
        this.children.push(node);
    }
    getValue() {
        return this.value;
    }
    getTextLines() {
        return this.textLines;
    }
    getLine() {
        return this.line;
    }
    getLevel() {
        return this.level;
    }
    isTextNode() {
        return this.textNode;
    }
    getText() {
        return this.isTextNode() ? this.textLines.join("\n") : this.value;
    }
    freeze() {
        if (this.isFrozen)
            return;
        for (const n of this.children)
            n.freeze();
        Object.freeze(this.children);
        Object.freeze(this.textLines);
        this.isFrozen = true;
    }
    getChild(cname) {
        const result = this.getChildrenByName(cname);
        if (result.length > 1) {
            throw new Error("More than 1 child. Use getChildren");
        }
        if (result.length === 0)
            return null;
        return result[0];
    }
    // Fast access methods to children
    getChildrenByName(cname) {
        const key = StringUtils_1.StringUtils.normalize(cname);
        const result = [];
        for (const child of this.children) {
            if (child.getNormalizedName() === key)
                result.push(child);
        }
        return result;
    }
    toString() {
        let s = "Node{";
        s += `line=${this.line}`;
        s += `, level=${this.level}`;
        s += `, name='${this.name}'`;
        if (this.namespace.length > 0)
            s += `, ns='${this.namespace}'`;
        s += `, text=${this.textNode}`;
        if (!this.textNode && this.value.length > 0)
            s += `, value='${this.value}'`;
        if (this.textNode)
            s += `, lines=${this.textLines.length}`;
        s += `, children=${this.children.length}`;
        s += "}";
        return s;
    }
}
exports.Node = Node;
//# sourceMappingURL=Node.js.map