"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGeneratorObserver = void 0;
const Parser_1 = require("../core/Parser");
class TokenGeneratorObserver {
    tokens = [];
    nodeByLine = new Map();
    onTextLine(node, lineNumber, line) {
        // No operation
    }
    onCreate(node, line) {
        const lineIndex = node.getLine() - 1;
        // Guardar nodo en el mapa
        this.nodeByLine.set(lineIndex, node);
        // Generar tokens para este nodo
        this.generateTokensForNode(node, lineIndex, line);
    }
    onFinish(node) {
        // Si es un nodo especial de template, parsear su contenido para colorear
        if (this.isTemplateContentNode(node)) {
            this.parseTemplateContent(node);
        }
    }
    isTemplateContentNode(node) {
        if (node.getNamespace() !== '@stxt.template') {
            return false;
        }
        const normalizedName = node.getNormalizedName();
        return normalizedName === 'structure' || normalizedName === 'description';
    }
    parseTemplateContent(node) {
        try {
            const content = node.getText();
            if (!content || content.trim() === '') {
                return;
            }
            // Obtener las líneas originales con su indentación
            const textLines = node.getTextLines();
            // Crear parser sin validación de schemas
            const parser = new Parser_1.Parser();
            // Crear observer interno para generar tokens
            const innerObserver = new TokenGeneratorObserver();
            parser.registerObserver(innerObserver);
            // Parsear el contenido del nodo
            parser.parseResult(content);
            // Obtener tokens generados y ajustar los números de línea y startChar
            const lineOffset = node.getLine(); // Offset desde el inicio del nodo
            const innerTokens = innerObserver.getTokens();
            for (const token of innerTokens) {
                const relativeLineIndex = token.line;
                // Obtener la indentación de la línea original
                const originalLine = textLines[relativeLineIndex] || '';
                const indentation = this.calculateIndentation(originalLine);
                this.tokens.push({
                    line: token.line + lineOffset,
                    startChar: token.startChar + indentation,
                    length: token.length,
                    type: token.type
                });
            }
        }
        catch (e) {
            // Si hay error al parsear, simplemente no añadimos tokens para este nodo
        }
    }
    calculateIndentation(line) {
        let count = 0;
        for (const char of line) {
            if (char === '\t' || char === ' ') {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }
    onComment(lineNumber, line) {
        // Generar token para comentario (líneas que empiezan con #)
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) {
            const lineIndex = lineNumber - 1;
            this.tokens.push({
                line: lineIndex,
                startChar: 0,
                length: line.length,
                type: 'comment'
            });
        }
    }
    getTokens() {
        return this.tokens;
    }
    getNodeByLine() {
        return this.nodeByLine;
    }
    generateTokensForNode(node, lineIndex, line) {
        if (node.isTextNode()) {
            const sepIndx = line.indexOf(">>");
            if (sepIndx === -1) {
                return;
            }
            const head = line.substring(0, sepIndx);
            const nsOpen = head.indexOf('(');
            const nsClose = head.indexOf(')');
            if (nsOpen !== -1 && nsClose !== -1) {
                this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'macro' });
                this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
                this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: line.length - nsClose - 1, type: 'macro' });
            }
            else {
                this.tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: 'macro' });
                this.tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: 'macro' });
            }
        }
        else {
            const colon = line.indexOf(':');
            if (colon === -1) {
                return;
            }
            const head = line.substring(0, colon);
            const nsOpen = head.indexOf('(');
            const nsClose = head.indexOf(')');
            if (nsOpen !== -1 && nsClose !== -1) {
                this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: 'property' });
                this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: 'namespace' });
                this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: 'property' });
            }
            else {
                this.tokens.push({ line: lineIndex, startChar: 0, length: colon, type: 'property' });
                this.tokens.push({ line: lineIndex, startChar: colon, length: 1, type: 'property' });
            }
            const valueStart = colon + 1;
            if (valueStart < line.length) {
                this.tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: 'string' });
            }
        }
    }
}
exports.TokenGeneratorObserver = TokenGeneratorObserver;
//# sourceMappingURL=TokenGeneratorObserver.js.map