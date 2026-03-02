"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regexType = regexType;
const ValidationException_1 = require("../../exceptions/ValidationException");
function regexType(name, pattern, error) {
    return {
        getName: () => name,
        validate(ndef, n) {
            const value = n.getText();
            if (!pattern.test(value)) {
                throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: ${error} (${value})`);
            }
        },
    };
}
//# sourceMappingURL=regexType.js.map