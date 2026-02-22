export class STXTException extends Error {
    public readonly code: string;
    public readonly cause?: unknown;

    constructor(code: string, message: string) {
        super(message);
        this.name = "STXTException";
        this.code = code;

        Object.setPrototypeOf(this, STXTException.prototype);
    }

    getCode(): string {
        return this.code;
    }

    toString(): string {
        const message = this.message;
        return `${this.name}[${this.code}]${message ? `: ${message}` : ""}`;
    }
}
