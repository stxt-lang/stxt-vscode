"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.BLOCK = {
    getName() {
        return "BLOCK";
    },
    validate(ndef, n) {
        if (n.getValue().length > 0) {
            throw new ValidationException_1.ValidationException(n.getLine(), "NOT_ALLOWED_VALUE", `Not allowed inline text in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=BLOCK.js.map