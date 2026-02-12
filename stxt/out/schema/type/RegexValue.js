"use strict";
// type/RegexValue.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegexValue = void 0;
const ValidationException_1 = require("../../exceptions/ValidationException");
/**
 * Base validator for simple regex-based value checks.
 */
class RegexValue {
    pattern;
    error;
    constructor(pattern, error) {
        this.pattern = pattern;
        this.error = error;
    }
    validate(ndef, n) {
        const value = n.getText();
        if (!this.pattern.test(value)) {
            throw new ValidationException_1.ValidationException(n.getLine(), "INVALID_VALUE", `${n.getName()}: ${this.error} (${value})`);
        }
    }
}
exports.RegexValue = RegexValue;
//# sourceMappingURL=RegexValue.js.map