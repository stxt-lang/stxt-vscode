"use strict";
// type/INLINE.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.INLINE = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
exports.INLINE = {
    getName() {
        return "INLINE";
    },
    validate(ndef, n) {
        if (n.getTextLines().length > 0) {
            throw new ParseException_1.ParseException(n.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=INLINE.js.map