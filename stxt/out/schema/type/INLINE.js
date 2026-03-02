"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INLINE = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.INLINE = {
    getName() {
        return "INLINE";
    },
    validate(ndef, n) {
        if (n.getTextLines().length > 0) {
            throw new ValidationException_1.ValidationException(n.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=INLINE.js.map