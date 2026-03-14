"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STXTException = void 0;
class STXTException extends Error {
    code;
    cause;
    constructor(code, message) {
        super(message);
        this.name = "STXTException";
        this.code = code;
        Object.setPrototypeOf(this, STXTException.prototype);
    }
    getCode() {
        return this.code;
    }
    toString() {
        const message = this.message;
        return `${this.name}[${this.code}]${message ? `: ${message}` : ""}`;
    }
}
exports.STXTException = STXTException;
//# sourceMappingURL=STXTException.js.map