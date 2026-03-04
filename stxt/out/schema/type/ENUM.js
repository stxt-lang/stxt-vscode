"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENUM = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.ENUM = {
    getName() {
        return "ENUM";
    },
    validate(ndef, n) {
        if (n.getTextLines().length > 0) {
            throw new ValidationException_1.ValidationException(n.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${n.getQualifiedName()}`);
        }
        const value = n.getValue();
        const allowed = ndef.getValues(); // ReadonlySet<string>
        if (!ndef.isAllowedValue(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`);
        }
    },
};
//# sourceMappingURL=ENUM.js.map