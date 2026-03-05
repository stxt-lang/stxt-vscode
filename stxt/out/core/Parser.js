"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const LineParser_1 = require("./LineParser");
const NodeCreator_1 = require("./NodeCreator");
const ParseResult_1 = require("./ParseResult");
const ParseException_1 = require("../exceptions/ParseException");
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
            this.processLine(line, lineNumber, stack, documents, result);
        }
        // Cerrar todos los nodos pendientes al EOF
        this.closeToLevel(stack, documents, 0, result);
        // Agregar nodos al resultado
        for (const doc of documents) {
            result.addNode(doc);
        }
        // Retorno resultado
        return result;
    }
    processLine(lineString, lineNumber, stack, documents, result) {
        try {
            const lastNode = stack.length === 0 ? null : stack[stack.length - 1];
            const lastLevel = lastNode ? lastNode.getLevel() : 0;
            const lastNodeText = lastNode ? lastNode.isTextNode() : false;
            // Parseamos línea
            const line = (0, LineParser_1.parseLine)(lineString, lastNodeText, lastLevel, lineNumber);
            if (line === null) {
                // Pasamos a observers
                this.observers.forEach(observer => {
                    observer.onComment(lineNumber, lineString);
                });
                return;
            }
            const currentLevel = line.indentLevel;
            // Si estamos dentro de un nodo texto, y el nivel indica que sigue siendo texto,
            // añadimos línea de texto y no creamos nodo.
            if (lastNodeText && currentLevel > lastLevel) {
                lastNode.addTextLine(line.lineWithoutIndent);
                return;
            }
            // Cerramos nodos hasta el nivel actual (esto "finaliza" y adjunta al padre/documentos)
            this.closeToLevel(stack, documents, currentLevel, result);
            // Creamos el nuevo nodo y lo dejamos "abierto" en la pila (NO lo adjuntamos aún)
            const parent = stack.length === 0 ? null : stack[stack.length - 1];
            const node = (0, NodeCreator_1.createNode)(line, lineNumber, currentLevel, parent);
            // Pasamos a observers
            this.observers.forEach(observer => {
                observer.onCreate(node, lineString);
            });
            // Añadimos a stack
            stack.push(node);
        }
        catch (e) {
            this.handleError(e, lineNumber, result);
        }
    }
    handleError(e, line, result, errorCode = "UNEXPECTED_ERROR", unknownErrorCode = "UNKNOWN_ERROR") {
        if (e instanceof ParseException_1.ParseException) {
            result.addError(e);
        }
        else if (e instanceof Error) {
            // Convertir errores genéricos a ParseException
            result.addError(new ParseException_1.ParseException(line, errorCode, e.message));
        }
        else {
            // Error desconocido
            result.addError(new ParseException_1.ParseException(line, unknownErrorCode, String(e)));
        }
    }
    closeToLevel(stack, documents, targetLevel, result) {
        while (stack.length > targetLevel) {
            const completed = stack.pop();
            completed.freeze();
            // Pasamos validators
            this.validators.forEach(validator => {
                try {
                    const errors = validator.validate(completed);
                    errors.forEach(error => {
                        result.addError(error);
                    });
                }
                catch (e) {
                    this.handleError(e, completed.getLine(), result, "VALIDATION_ERROR", "UNKNOWN_VALIDATION_ERROR");
                }
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