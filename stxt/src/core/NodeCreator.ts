import { LineIndent } from "./LineIndent";
import { NameNamespaceParser } from "./NameNamespaceParser";
import { Node } from "./Node";
import { ParseException } from "../exceptions/ParseException";

export function createNode(lineIndent: LineIndent, lineNumber: number, level: number, parent: Node | null): Node {
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
