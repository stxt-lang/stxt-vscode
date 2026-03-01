"use strict";
// type/ENUM.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENUM = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
exports.ENUM = {
    getName() {
        return "ENUM";
    },
    validate(ndef, n) {
        if (n.getTextLines().length > 0) {
            throw new ParseException_1.ParseException(n.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${n.getQualifiedName()}`);
        }
        const value = n.getValue();
        const allowed = ndef.getValues(); // ReadonlySet<string>
        if (!allowed.has(value)) {
            throw new ParseException_1.ParseException(n.getLine(), "INVALID_VALUE", `The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`);
        }
    },
};
//# sourceMappingURL=ENUM.js.map