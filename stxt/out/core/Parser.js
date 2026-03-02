"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const LineIndentParser_1 = require("./LineIndentParser");
const NodeCreator_1 = require("./NodeCreator");
const ParseResult_1 = require("./ParseResult");
class Parser {
    observers = [];
    validators = [];
    registerObserver(observer) {
        this.observers.push(observer);
    }
    registerValidator(validator) {
        this.validators.push(validator);
    }
    parse(content) {
        const result = this.parseResult(content);
        if (result.hasErrors()) {
            const error = result.getErrors()[0];
            throw error;
        }
        return result.getNodes();
    }
    parseResult(content) {
        content = this.removeUTF8BOM(content);
        const result = new ParseResult_1.ParseResult();
        const stack = [];
        const documents = [];
        let lineNumber = 0;
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            lineNumber++;
            this.processLine(line, lineNumber, stack, documents);
        }
        // Cerrar todos los nodos pendientes al EOF
        this.closeToLevel(stack, documents, 0);
        // Agregar nodos al resultado
        for (const doc of documents) {
            result.addNode(doc);
        }
        // Retorno resultado
        return result;
    }
    processLine(line, lineNumber, stack, documents) {
        const lastNode = stack.length === 0 ? null : stack[stack.length - 1];
        const lastLevel = lastNode ? lastNode.getLevel() : 0;
        const lastNodeText = lastNode ? lastNode.isTextNode() : false;
        // Parseamos línea
        const lineIndent = (0, LineIndentParser_1.parseLineIndent)(line, lastNodeText, lastLevel, lineNumber);
        if (lineIndent === null) {
            return;
        }
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
        const node = (0, NodeCreator_1.createNode)(lineIndent, lineNumber, currentLevel, parent);
        // Pasamos a observers
        this.observers.forEach(observer => {
            observer.onCreate(node);
        });
        // Añadimos a stack
        stack.push(node);
    }
    closeToLevel(stack, documents, targetLevel) {
        while (stack.length > targetLevel) {
            const completed = stack.pop();
            completed.freeze();
            // Pasamos validators
            this.validators.forEach(validator => {
                validator.validate(completed);
            });
            if (stack.length === 0) {
                documents.push(completed);
            }
            else {
                stack[stack.length - 1].addChild(completed);
            }
            // Pasamos a observers
            this.observers.forEach(observer => {
                observer.onFinish(completed);
            });
        }
    }
    removeUTF8BOM(content) {
        return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=Parser.js.map