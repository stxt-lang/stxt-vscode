"use strict";
// NamespaceValidator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamespaceValidator = void 0;
const ParseException_1 = require("./ParseException");
class NamespaceValidator {
    /**
     * Valida el namespace lógico.
     *
     * Reglas:
     * - Solo minúsculas, dígitos y punto.
     * - Puede empezar opcionalmente por '@'.
     * - Debe ser una o varias etiquetas estilo dominio separadas por '.':
     *   etiqueta := [a-z0-9]+
     * ejemplos válidos: "xxx", "xxx.ddd", "zzz.ttt.ooo", "@xxx", "@xxx.ddd".
     */
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