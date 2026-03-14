"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseException = void 0;
class ParseException extends Error {
    line;
    code;
    constructor(line, code, message) {
        super(message);
        this.name = "ParseException";
        this.line = line;
        this.code = code;
        Object.setPrototypeOf(this, ParseException.prototype);
    }
    toString() {
        return `${this.name} [line=${this.line}, code=${this.code}]: ${this.message}`;
    }
}
exports.ParseException = ParseException;
//# sourceMappingURL=ParseException.js.map