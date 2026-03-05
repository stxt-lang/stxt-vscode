"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.GROUP = {
    getName() {
        return "GROUP";
    },
    validate(nodeDef, node) {
        if (node.getValue().length > 0 || node.getTextLines().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `Node '${node.getName()}' has to be empty`);
        }
    },
};
//# sourceMappingURL=GROUP.js.map