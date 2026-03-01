"use strict";
// type/TEXT.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEXT = void 0;
const ParseException_1 = require("../../exceptions/ParseException");
exports.TEXT = {
    getName() {
        return "TEXT";
    },
    validate(ndef, n) {
        if (n.getChildren().length > 0) {
            throw new ParseException_1.ParseException(n.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=TEXT.js.map