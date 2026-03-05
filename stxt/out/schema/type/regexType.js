"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regexType = regexType;
const ValidationException_1 = require("../../exceptions/ValidationException");
function regexType(name, pattern, error) {
    return {
        getName: () => name,
        validate(nodeDef, node) {
            const value = node.getText();
            if (!pattern.test(value)) {
                throw new ValidationException_1.ValidationException(node.getLine(), "INVALID_VALUE", `${node.getName()}: ${error} (${value})`);
            }
        },
    };
}
//# sourceMappingURL=regexType.js.map