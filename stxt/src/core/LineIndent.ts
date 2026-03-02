export class LineIndent {
	// Igual que en Java: campos públicos e inmutables
	public readonly indentLevel: number;
	public readonly lineWithoutIndent: string;

	constructor(level: number, line: string) {
		this.indentLevel = level;
		this.lineWithoutIndent = line;
	}
}

