"use strict";
// type/GROUP.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
exports.GROUP = {
    getName() {
        return "GROUP";
    },
    validate(ndef, n) {
        if (n.getValue().length > 0 || n.getTextLines().length > 0) {
            throw new ParseException_1.ParseException(n.getLine(), "INVALID_VALUE", `Node '${n.getName()}' has to be empty`);
        }
    },
};
//# sourceMappingURL=GROUP.js.map