import { Node } from "../core/Node";

export interface Observer {
	onCreate(node: Node): void;
	onFinish(node: Node): void;
	onComment(lineNumber: number, line: string): void;
}
