"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEXADECIMAL = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
const StringUtils_1 = require("../../core/StringUtils");
exports.HEXADECIMAL = {
    getName() {
        return "HEXADECIMAL";
    },
    validate(ndef, n) {
        // Elimina espacios, tabs y saltos de línea
        let value = StringUtils_1.StringUtils.cleanSpaces(n.getText());
        if (value.length === 0) {
            throw invalid(n, "Invalid hexadecimal (empty)");
        }
        // Permitir prefijo '#'
        if (value.startsWith("#")) {
            value = value.substring(1);
        }
        if (value.length === 0) {
            throw invalid(n, "Invalid hexadecimal (only '#')");
        }
        // Longitud par (hexadecimal por bytes)
        if ((value.length & 1) !== 0) {
            throw invalid(n, "Invalid hexadecimal length (must be even)");
        }
        // Validar caracteres hexadecimales
        for (let i = 0; i < value.length; i++) {
            const c = value.charAt(i);
            // Equivalente a Character.digit(c, 16) == -1
            if (!/^[0-9a-fA-F]$/.test(c)) {
                throw invalid(n, `Invalid hexadecimal character '${c}'`);
            }
        }
    },
};
function invalid(n, msg) {
    return new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: ${msg}`);
}
//# sourceMappingURL=HEXADECIMAL.js.map