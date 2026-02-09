// constants.ts

export class Constants {
	static readonly COMMENT_CHAR: string = "#";
	static readonly TAB_SPACES: number = 4;
	static readonly TAB: string = "\t";
	static readonly SPACE: string = " ";
	static readonly SEP_NODE: string = ":";

	// En Node.js normalmente se usa un string con el nombre del encoding.
	static readonly ENCODING: BufferEncoding = "utf8";

	static readonly EMPTY_NAMESPACE: string = "";
}
