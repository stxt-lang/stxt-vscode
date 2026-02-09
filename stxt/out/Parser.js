"use strict";
// Parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const ParseException_1 = require("./ParseException");
const Node_1 = require("./Node");
const LineIndentParser_1 = require("./LineIndentParser");
const NameNamespaceParser_1 = require("./NameNamespaceParser");
function removeUTF8BOM(content) {
    // BOM UTF-8: U+FEFF (a veces aparece al principio)
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
class Parser {
    parse(content) {
        content = removeUTF8BOM(content);
        const stack = [];
        const documents = [];
        let lineNumber = 0;
        // BufferedReader.readLine() (Java) equivale a iterar por líneas sin el '\n'
        // split mantiene línea vacía final si el texto termina con salto de línea.
        const lines = content.split(/\r?\n/);
        try {
            for (const line of lines) {
                lineNumber++;
                this.processLine(line, lineNumber, stack, documents);
            }
        }
        catch (e) {
            // En Java este try/catch era por IOException; aquí el parse no hace IO.
            // Lo dejamos por simetría: si quieres, puedes quitarlo.
            throw e;
        }
        // Cerrar todos los nodos pendientes al EOF
        this.closeToLevel(stack, documents, 0);
        // Retorno documentos
        return documents;
    }
    processLine(line, lineNumber, stack, documents) {
        const lastNode = stack.length === 0 ? null : stack[stack.length - 1];
        const lastLevel = lastNode ? lastNode.getLevel() : 0;
        const lastNodeText = lastNode ? lastNode.isTextNode() : false;
        // Parseamos línea
        const lineIndent = LineIndentParser_1.LineIndentParser.parseLine(line, lastNodeText, lastLevel, lineNumber);
        if (lineIndent == null)
            return;
        const currentLevel = lineIndent.indentLevel;
        // Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
        // añadimos línea de texto y no creamos nodo.
        if (lastNodeText && currentLevel > lastLevel) {
            lastNode.addTextLine(lineIndent.lineWithoutIndent);
            return;
        }
        // Cerramos nodos hasta el nivel actual (esto "finaliza" y adjunta al padre/documentos)
        this.closeToLevel(stack, documents, currentLevel);
        // Creamos el nuevo nodo y lo dejamos "abierto" en la pila (NO lo adjuntamos aún)
        const parent = stack.length === 0 ? null : stack[stack.length - 1];
        const node = this.createNode(lineIndent, lineNumber, currentLevel, parent);
        // Añadimos a stack
        stack.push(node);
    }
    closeToLevel(stack, documents, targetLevel) {
        while (stack.length > targetLevel) {
            const completed = stack.pop();
            completed.freeze();
            if (stack.length === 0)
                documents.push(completed);
            else
                stack[stack.length - 1].addChild(completed);
        }
    }
    createNode(lineIndent, lineNumber, level, parent) {
        const line = lineIndent.lineWithoutIndent;
        let name;
        let value;
        let textNode = false;
        const nodeIndex = line.indexOf(":");
        const textIndex = line.indexOf(">>");
        if (nodeIndex === -1 && textIndex === -1) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        }
        else if (nodeIndex === -1 && textIndex !== -1) {
            textNode = true;
        }
        else if (nodeIndex !== -1 && textIndex === -1) {
            textNode = false;
        }
        else if (nodeIndex < textIndex) {
            textNode = false;
        }
        else {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        }
        if (textNode) {
            name = line.substring(0, textIndex);
            value = line.substring(textIndex + 2);
        }
        else {
            name = line.substring(0, nodeIndex);
            value = line.substring(nodeIndex + 1);
        }
        if (textNode && value.trim().length > 0) {
            throw new ParseException_1.ParseException(lineNumber, "INLINE_VALUE_NOT_VALID", `Line not valid: ${line}`);
        }
        // Namespace por defecto: heredado del padre
        const nn = NameNamespaceParser_1.NameNamespaceParser.parse(name, parent ? parent.getNamespace() : null, lineNumber, line);
        name = nn.getName();
        const namespace = nn.getNamespace();
        // Validamos nombre
        if (name.length === 0) {
            throw new ParseException_1.ParseException(lineNumber, "INVALID_LINE", `Line not valid: ${line}`);
        }
        // Creamos nodo
        return new Node_1.Node(lineNumber, level, name, namespace, textNode, value);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=Parser.js.map