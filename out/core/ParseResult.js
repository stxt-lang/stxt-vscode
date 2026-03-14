"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseResult = void 0;
class ParseResult {
    nodes;
    errors;
    constructor(nodes = [], errors = []) {
        this.nodes = nodes;
        this.errors = errors;
    }
    getNodes() {
        return this.nodes;
    }
    getErrors() {
        return this.errors;
    }
    hasErrors() {
        return this.errors.length > 0;
    }
    addError(error) {
        this.errors.push(error);
    }
    addNode(node) {
        this.nodes.push(node);
    }
}
exports.ParseResult = ParseResult;
//# sourceMappingURL=ParseResult.js.map