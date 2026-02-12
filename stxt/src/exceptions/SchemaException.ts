// SchemaException.ts

export class SchemaException extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SchemaException";
    this.code = code;
    Object.setPrototypeOf(this, SchemaException.prototype);
  }

  toString(): string {
    return `${this.name} [code=${this.code}]: ${this.message}`;
  }
}
