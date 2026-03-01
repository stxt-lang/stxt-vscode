"use strict";
// type/regexType.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.regexType = regexType;
const ParseException_1 = require("../../exceptions/ParseException");
function regexType(name, pattern, error) {
    return {
        getName: () => name,
        validate(ndef, n) {
            const value = n.getText();
            if (!pattern.test(value)) {
                throw new ParseException_1.ParseException(n.getLine(), "INVALID_VALUE", `${n.getName()}: ${error} (${value})`);
            }
        },
    };
}
//# sourceMappingURL=regexType.js.map