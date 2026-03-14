"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameNamespaceParser = void 0;
const ParseException_1 = require("../exceptions/ParseException");
const NameNamespace_1 = require("./NameNamespace");
class NameNamespaceParser {
    constructor() {
    }
    static parse(rawName, inheritedNs, lineNumber, fullLine) {
        if (rawName == null) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${fullLine}`);
        }
        rawName = rawName.trim();
        const startIndex = rawName.indexOf("(");
        const endIndex = rawName.indexOf(")");
        let name;
        let namespace = inheritedNs ?? "";
        // Encontrados los dos
        if (startIndex !== -1 && endIndex !== -1) {
            if (startIndex > endIndex || endIndex !== rawName.length - 1) {
                throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
            name = rawName.substring(0, startIndex).trim();
            namespace = rawName.substring(startIndex + 1, endIndex).trim();
            if (namespace.length === 0) {
                throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
        }
        // Ninguno de los dos
        else if (startIndex === -1 && endIndex === -1) {
            name = rawName;
        }
        // Solo uno de los dos
        else {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
        }
        // Retorno
        return new NameNamespace_1.NameNamespace(name, namespace.toLowerCase());
    }
}
exports.NameNamespaceParser = NameNamespaceParser;
//# sourceMappingURL=NameNamespaceParser.js.map