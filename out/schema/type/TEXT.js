"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEXT = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.TEXT = {
    getName() {
        return "TEXT";
    },
    validate(nodeDef, node) {
        if (node.getChildren().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_CHILDREN_TEXT", `Not allowed children nodes in node ${node.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=TEXT.js.map