"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENUM = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.ENUM = {
    getName() {
        return "ENUM";
    },
    validate(nodeDef, node) {
        if (node.getTextLines().length > 0) {
            throw new ValidationException_1.ValidationException(node.getLine(), "NOT_ALLOWED_TEXT", `Not allowed text in node ${node.getQualifiedName()}`);
        }
        const value = node.getValue();
        const allowed = nodeDef.getValues(); // ReadonlySet<string>
        if (!nodeDef.isAllowedValue(value)) {
            throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `The value '${value}' not allowed. Only: ${Array.from(allowed).join(", ")}`);
        }
    },
};
//# sourceMappingURL=ENUM.js.map