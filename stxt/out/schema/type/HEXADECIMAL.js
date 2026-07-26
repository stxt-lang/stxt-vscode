"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEXADECIMAL = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
const binaryValue_1 = require("./binaryValue");
exports.HEXADECIMAL = {
    getName() {
        return "HEXADECIMAL";
    },
    // STXT-SCHEMA-SPEC 9.5: cadena [0-9A-Fa-f]+ (sin prefijo '#' ni longitud par)
    validate(ndef, n) {
        const value = (0, binaryValue_1.binaryValue)(n);
        if (!/^[0-9A-Fa-f]+$/.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid hexadecimal (${value})`);
        }
    },
};
//# sourceMappingURL=HEXADECIMAL.js.map