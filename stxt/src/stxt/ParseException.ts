// ParseException.ts

export class ParseException extends Error {
  public readonly line: number;
  public readonly code: string;

  constructor(line: number, code: string, message: string) {
    super(message);

    this.name = "ParseException";
    this.line = line;
    this.code = code;

    // Necesario para que instanceof funcione correctamente al extender Error
    Object.setPrototypeOf(this, ParseException.prototype);
  }

  toString(): string {
    return `${this.name} [line=${this.line}, code=${this.code}]: ${this.message}`;
  }
}
