"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = void 0;
const ParseException_1 = require("./ParseException");
class ValidationException extends ParseException_1.ParseException {
    constructor(line, code, message) {
        super(line, code, message);
        this.name = "ValidationException";
        Object.setPrototypeOf(this, ValidationException.prototype);
    }
}
exports.ValidationException = ValidationException;
//# sourceMappingURL=ValidationException.js.map