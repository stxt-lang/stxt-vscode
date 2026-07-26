"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BINARY = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
const binaryValue_1 = require("./binaryValue");
exports.BINARY = {
    getName() {
        return "BINARY";
    },
    // STXT-SCHEMA-SPEC 9.5: cadena [01]+
    validate(ndef, n) {
        const value = (0, binaryValue_1.binaryValue)(n);
        if (!/^[01]+$/.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: Invalid binary (${value})`);
        }
    },
};
//# sourceMappingURL=BINARY.js.map