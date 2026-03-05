"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNode = createNode;
const NameNamespaceParser_1 = require("./NameNamespaceParser");
const Node_1 = require("./Node");
const ParseException_1 = require("../exceptions/ParseException");
const Constants_1 = require("./Constants");
function createNode(lineIndent, lineNumber, level, parent) {
    const line = lineIndent.content;
    let name;
    let value;
    let textNode = false;
    const nodeIndex = line.indexOf(Constants_1.Constants.SEP_NODE);
    const textIndex = line.indexOf(Constants_1.Constants.SEP_TEXT_NODE);
    if (nodeIndex === -1 && textIndex === -1) {
        throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
    }
    else if (nodeIndex === -1 && textIndex !== -1) {
        textNode = true;
    }
    else if (nodeIndex !== -1 && textIndex === -1) {
        textNode = false;
    }
    else if (nodeIndex < textIndex) {
        textNode = false;
    }
    else {
        throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
    }
    if (textNode) {
        name = line.substring(0, textIndex);
        value = line.substring(textIndex + Constants_1.Constants.SEP_TEXT_NODE.length);
    }
    else {
        name = line.substring(0, nodeIndex);
        value = line.substring(nodeIndex + Constants_1.Constants.SEP_NODE.length);
    }
    if (textNode && value.trim().length > 0) {
        throw new ParseException_1.ParseException(lineNumber, "INLINE_VALUE_NOT_VALID", `Line not valid: ${line}`);
    }
    // Namespace por defecto: heredado del padre
    const nameNamespace = NameNamespaceParser_1.NameNamespaceParser.parse(name, parent ? parent.getNamespace() : null, lineNumber, line);
    name = nameNamespace.getName();
    const namespace = nameNamespace.getNamespace();
    // Validamos nombre
    if (name.length === 0) {
        throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
    }
    // Creamos nodo
    return new Node_1.Node(lineNumber, level, name, namespace, textNode, value);
}
//# sourceMappingURL=NodeCreator.js.map