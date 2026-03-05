export class Line {
	// Igual que en Java: campos públicos e inmutables
	public readonly level: number;
	public readonly content: string;

	constructor(level: number, line: string) {
		this.level = level;
		this.content = line;
	}
}

