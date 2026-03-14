"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamespaceValidator = void 0;
const ParseException_1 = require("../exceptions/ParseException");
class NamespaceValidator {
    static NAMESPACE_FORMAT = /^@?[a-z0-9]+(\.[a-z0-9]+)+$/;
    static validateNamespaceFormat(namespace, lineNumber) {
        if (namespace == null || namespace.length === 0) {
            return;
        }
        if (!NamespaceValidator.NAMESPACE_FORMAT.test(namespace)) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_NAMESPACE", `Namespace not valid: ${namespace}`);
        }
    }
}
exports.NamespaceValidator = NamespaceValidator;
//# sourceMappingURL=NamespaceValidator.js.map