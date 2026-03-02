"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
exports.GROUP = {
    getName() {
        return "GROUP";
    },
    validate(ndef, n) {
        if (n.getValue().length > 0 || n.getTextLines().length > 0) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `Node '${n.getName()}' has to be empty`);
        }
    },
};
//# sourceMappingURL=GROUP.js.map