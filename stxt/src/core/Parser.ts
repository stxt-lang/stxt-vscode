// Parser.ts

import { Node } from "./Node";
import { parseLine } from "./LineIndentParser";
import { LineIndent } from "./LineIndent";
import { createNode } from "./NodeCreator";

export class Parser {

	parse(content: string): Node[] {
		content = this.removeUTF8BOM(content);

		const stack: Node[] = [];
		const documents: Node[] = [];

		let lineNumber = 0;

		const lines = content.split(/\r?\n/);

		for (const line of lines) {
			lineNumber++;
			this.processLine(line, lineNumber, stack, documents);
		}

		// Cerrar todos los nodos pendientes al EOF
		this.closeToLevel(stack, documents, 0);

		// Retorno documentos
		return documents;
	}

	private processLine(line: string, lineNumber: number, stack: Node[], documents: Node[]): void {
		const lastNode: Node | null = stack.length === 0 ? null : stack[stack.length - 1];
		const lastLevel = lastNode ? lastNode.getLevel() : 0;
		const lastNodeText = lastNode ? lastNode.isTextNode() : false;

		// Parseamos línea
		const lineIndent: LineIndent | null = parseLine(line, lastNodeText, lastLevel, lineNumber);

		if (lineIndent == null) {
			return;
		}

		const currentLevel = lineIndent.indentLevel;

		// Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
		// añadimos línea de texto y no creamos nodo.
		if (lastNodeText && currentLevel > lastLevel) {
			lastNode!.addTextLine(lineIndent.lineWithoutIndent);
			return;
		}

		// Cerramos nodos hasta el nivel actual (esto "finaliza" y adjunta al padre/documentos)
		this.closeToLevel(stack, documents, currentLevel);

		// Creamos el nuevo nodo y lo dejamos "abierto" en la pila (NO lo adjuntamos aún)
		const parent: Node | null = stack.length === 0 ? null : stack[stack.length - 1];
		const node = createNode(lineIndent, lineNumber, currentLevel, parent);

		// Añadimos a stack
		stack.push(node);
	}

	private closeToLevel(stack: Node[], documents: Node[], targetLevel: number): void {
		while (stack.length > targetLevel) {
			const completed = stack.pop()!;
			completed.freeze();

			if (stack.length === 0) {
				documents.push(completed);
			} else {
				stack[stack.length - 1].addChild(completed);
			}
		}
	}
	private removeUTF8BOM(content: string): string {
		return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
	}
}


