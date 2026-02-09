"use strict";
// NameNamespaceParser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameNamespaceParser = void 0;
const ParseException_1 = require("./ParseException");
const NameNamespace_1 = require("./NameNamespace");
class NameNamespaceParser {
    constructor() {
        // Utility
    }
    static parse(rawName, inheritedNs, lineNumber, fullLine) {
        if (rawName == null) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${fullLine}`);
        }
        rawName = rawName.trim();
        const indexInicio = rawName.indexOf("(");
        const indexFin = rawName.indexOf(")");
        let name;
        let namespace = inheritedNs ?? "";
        // Encontrados los dos
        if (indexInicio !== -1 && indexFin !== -1) {
            if (indexInicio > indexFin || indexFin !== rawName.length - 1) {
                throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
            name = rawName.substring(0, indexInicio).trim();
            namespace = rawName.substring(indexInicio + 1, indexFin).trim();
            if (namespace.length === 0) {
                throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
            }
        }
        // Ninguno de los dos
        else if (indexInicio === -1 && indexFin === -1) {
            name = rawName;
        }
        // Solo uno de los dos
        else {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Line not valid: ${fullLine}`);
        }
        // Equivalente a toLowerCase(Locale.ROOT)
        return new NameNamespace_1.NameNamespace(name, namespace.toLowerCase());
    }
}
exports.NameNamespaceParser = NameNamespaceParser;
//# sourceMappingURL=NameNamespaceParser.js.map