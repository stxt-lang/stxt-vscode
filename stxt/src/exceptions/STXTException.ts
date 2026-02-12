export class STXTException extends Error {
    public readonly code: string;
    public readonly cause?: unknown;

    constructor(code: string, message: string, cause?: unknown) {
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

    getCode(): string {
        return this.code;
    }

    toString(): string {
        const message = this.message;
        return `${this.name}[${this.code}]${message ? `: ${message}` : ""}`;
    }
}
