"use strict";
// SchemaException.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaException = void 0;
class SchemaException extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "SchemaException";
        this.code = code;
        Object.setPrototypeOf(this, SchemaException.prototype);
    }
    toString() {
        return `${this.name} [code=${this.code}]: ${this.message}`;
    }
}
exports.SchemaException = SchemaException;
//# sourceMappingURL=SchemaException.js.map