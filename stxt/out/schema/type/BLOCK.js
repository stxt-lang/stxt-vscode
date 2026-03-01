"use strict";
// type/BLOCK.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
exports.BLOCK = {
    getName() {
        return "BLOCK";
    },
    validate(ndef, n) {
        if (n.getValue().length > 0) {
            throw new ParseException_1.ParseException(n.getLine(), "NOT_ALLOWED_VALUE", `Not allowed inline text in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=BLOCK.js.map