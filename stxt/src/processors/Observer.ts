import { Node } from "../core/Node";

export interface Observer {
	onCreate(node: Node, line:string): void;
	onFinish(node: Node): void;
	onComment(lineNumber: number, line: string): void;
	onTextLine(node: Node, lineNumber: number, line: string): void;
}
