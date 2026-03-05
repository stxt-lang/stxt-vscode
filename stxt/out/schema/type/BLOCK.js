"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.BLOCK = {
    getName() {
        return "BLOCK";
    },
    validate(nodeDef, node) {
        if (node.getValue().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_VALUE", `Not allowed inline text in node ${node.getQualifiedName()}`);
        }
    },
};
//# sourceMappingURL=BLOCK.js.map