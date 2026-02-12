"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STXTException = void 0;
class STXTException extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.name = "STXTException";
        this.code = code;
        this.cause = cause;
        Object.setPrototypeOf(this, STXTException.prototype);
        // Si te interesa conservar la pila del error original cuando cause es Error
        if (cause instanceof Error && cause.stack) {
            this.stack = `${this.stack ?? ""}\nCaused by: ${cause.stack}`;
        }
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