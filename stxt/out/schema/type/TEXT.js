"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEXT = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.TEXT = {
    getName() {
        return "TEXT";
    },
    validate(ndef, n) {
        if (n.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(n.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${n.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=TEXT.js.map