"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BINARY = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
const StringUtils_1 = require("../../core/StringUtils");
exports.BINARY = {
    getName() {
        return "BINARY";
    },
    // En forma BLOCK se valida la concatenación de líneas ignorando
    // saltos de línea y espacios (STXT-SCHEMA-SPEC 9.5)
    validate(ndef, n) {
        const value = StringUtils_1.StringUtils.cleanSpaces(n.getText());
        if (!/^[01]+$/.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid binary (${value})`);
        }
    },
};
//# sourceMappingURL=BINARY.js.map