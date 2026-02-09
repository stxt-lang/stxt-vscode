// Parser.ts

import { readFile } from "fs/promises";
import { ParseException } from "./ParseException";
import { Node } from "./Node";
import { LineIndent, LineIndentParser } from "./LineIndentParser";
import { NameNamespaceParser } from "./NameNamespaceParser";

function removeUTF8BOM(content: string): string {
	// BOM UTF-8: U+FEFF (a veces aparece al principio)
	return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

export class Parser {

	parse(content: string): Node[] {
		content = removeUTF8BOM(content);

		const stack: Node[] = [];
		const documents: Node[] = [];

		let lineNumber = 0;

		// BufferedReader.readLine() (Java) equivale a iterar por líneas sin el '\n'
		// split mantiene línea vacía final si el texto termina con salto de línea.
		const lines = content.split(/\r?\n/);

		try {
			for (const line of lines) {
				lineNumber++;
				this.processLine(line, lineNumber, stack, documents);
			}
		} catch (e) {
			// En Java este try/catch era por IOException; aquí el parse no hace IO.
			// Lo dejamos por simetría: si quieres, puedes quitarlo.
			throw e;
		}

		// Cerrar todos los nodos pendientes al EOF
		this.closeToLevel(stack, documents, 0);

		// Retorno documentos
		return documents;
	}

	private processLine(
		line: string,
		lineNumber: number,
		stack: Node[],
		documents: Node[]
	): void {
		const lastNode: Node | null = stack.length === 0 ? null : stack[stack.length - 1];
		const lastLevel = lastNode ? lastNode.getLevel() : 0;
		const lastNodeText = lastNode ? lastNode.isTextNode() : false;

		// Parseamos línea
		const lineIndent: LineIndent | null = LineIndentParser.parseLine(
			line,
			lastNodeText,
			lastLevel,
			lineNumber
		);
		if (lineIndent == null) return;

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
		const node = this.createNode(lineIndent, lineNumber, currentLevel, parent);

		// Añadimos a stack
		stack.push(node);
	}

	private closeToLevel(stack: Node[], documents: Node[], targetLevel: number): void {
		while (stack.length > targetLevel) {
			const completed = stack.pop()!;
			completed.freeze();

			if (stack.length === 0) documents.push(completed);
			else stack[stack.length - 1].addChild(completed);
		}
	}

	private createNode(
		lineIndent: LineIndent,
		lineNumber: number,
		level: number,
		parent: Node | null
	): Node {
		const line = lineIndent.lineWithoutIndent;

		let name: string;
		let value: string;
		let textNode = false;

		const nodeIndex = line.indexOf(":");
		const textIndex = line.indexOf(">>");

		if (nodeIndex === -1 && textIndex === -1) {
			throw new ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
		} else if (nodeIndex === -1 && textIndex !== -1) {
			textNode = true;
		} else if (nodeIndex !== -1 && textIndex === -1) {
			textNode = false;
		} else if (nodeIndex < textIndex) {
			textNode = false;
		} else {
			throw new ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
		}

		if (textNode) {
			name = line.substring(0, textIndex);
			value = line.substring(textIndex + 2);
		} else {
			name = line.substring(0, nodeIndex);
			value = line.substring(nodeIndex + 1);
		}

		if (textNode && value.trim().length > 0) {
			throw new ParseException(lineNumber, "INLINE_VALUE_NOT_VALID", `Line not valid: ${line}`);
		}

		// Namespace por defecto: heredado del padre
		const nn = NameNamespaceParser.parse(
			name,
			parent ? parent.getNamespace() : null,
			lineNumber,
			line
		);
		name = nn.getName();
		const namespace = nn.getNamespace();

		// Validamos nombre
		if (name.length === 0) {
			throw new ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
		}

		// Creamos nodo
		return new Node(lineNumber, level, name, namespace, textNode, value);
	}
}
