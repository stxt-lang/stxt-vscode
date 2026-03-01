"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeException = void 0;
class RuntimeException extends Error {
    code;
    cause;
    constructor(code, message) {
        super(message);
        this.name = "RuntimeException";
        this.code = code;
        Object.setPrototypeOf(this, RuntimeException.prototype);
    }
    getCode() {
        return this.code;
    }
    toString() {
        const message = this.message;
        return `${this.name}[${this.code}]${message ? `: ${message}` : ""}`;
    }
}
exports.RuntimeException = RuntimeException;
//# sourceMappingURL=RuntimeException.js.map