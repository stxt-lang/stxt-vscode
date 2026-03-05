export class Line {
	// Igual que en Java: campos públicos e inmutables
	public readonly level: number;
	public readonly content: string;
	public readonly isComment: boolean;
	public readonly isBlock: boolean;

	constructor(level: number, content: string, isComment: boolean, isBlock: boolean) {
		this.level = level;
		this.content = content;
		this.isComment = isComment;
		this.isBlock = isBlock;

	}
	isEmpty(): boolean {
		return this.content.trim() === "";
	}
}

