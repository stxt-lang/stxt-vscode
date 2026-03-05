"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGeneratorObserver = void 0;
const LineParser_1 = require("../core/LineParser");
class TokenGeneratorObserver {
    tokens = [];
    nodeByLine = new Map();
    onTextLine(node, lineNumber, line) {
        // Colorear contenido de nodos template especiales
        if (this.isTemplateContentNode(node)) {
            this.generateTokensForTemplateLine(lineNumber, line, node.getLevel());
        }
    }
    isTemplateContentNode(node) {
        if (node.getNamespace() !== '@stxt.template') {
            return false;
        }
        const normalizedName = node.getNormalizedName();
        return normalizedName === 'structure' || normalizedName === 'description';
    }
    generateTokensForTemplateLine(lineNumber, lineString, parentLevel) {
        try {
            // Parsear la línea sin validación estricta
            const line = (0, LineParser_1.parseLine)(lineString, true, parentLevel, lineNumber, false);
            if (line.isComment) {
                // Línea de comentario
                this.tokens.push({
                    line: lineNumber - 1,
                    startChar: 0,
                    length: lineString.length,
                    type: 'comment'
                });
                return;
            }
            if (line.isEmpty()) {
                return;
            }
            const lineIndex = lineNumber - 1;
            const content = line.content;
            const indentLength = line.indentLength;
            // Detectar si es un nodo de texto (contiene >>)
            const textSepIndex = content.indexOf('>>');
            if (textSepIndex !== -1) {
                // Es un nodo de texto
                this.generateTextNodeTokens(lineIndex, content, indentLength, textSepIndex);
            }
            else {
                // Es un nodo inline (contiene :)
                const colonIndex = content.indexOf(':');
                if (colonIndex !== -1) {
                    this.generateInlineNodeTokens(lineIndex, content, indentLength, colonIndex);
                }
            }
        }
        catch (e) {
            // Si hay error al parsear, simplemente no generamos tokens para esta línea
        }
    }
    generateTextNodeTokens(lineIndex, content, indentLength, textSepIndex) {
        const head = content.substring(0, textSepIndex);
        const nsOpen = head.indexOf('(');
        const nsClose = head.indexOf(')');
        if (nsOpen !== -1 && nsClose !== -1) {
            // Tiene namespace
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength,
                length: nsOpen,
                type: 'macro'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + nsOpen,
                length: nsClose - nsOpen + 1,
                type: 'namespace'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + nsClose + 1,
                length: content.length - (nsClose + 1),
                type: 'macro'
            });
        }
        else {
            // Sin namespace
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength,
                length: textSepIndex,
                type: 'macro'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + textSepIndex,
                length: 2,
                type: 'macro'
            });
        }
    }
    generateInlineNodeTokens(lineIndex, content, indentLength, colonIndex) {
        const head = content.substring(0, colonIndex);
        const nsOpen = head.indexOf('(');
        const nsClose = head.indexOf(')');
        if (nsOpen !== -1 && nsClose !== -1) {
            // Tiene namespace
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength,
                length: nsOpen,
                type: 'property'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + nsOpen,
                length: nsClose - nsOpen + 1,
                type: 'namespace'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + nsClose + 1,
                length: colonIndex - (nsClose + 1) + 1,
                type: 'property'
            });
        }
        else {
            // Sin namespace
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength,
                length: colonIndex,
                type: 'property'
            });
            this.tokens.push({
                line: lineIndex,
                startChar: indentLength + colonIndex,
                length: 1,
                type: 'property'
            });
        }
        // Valor después del colon
        const valueStart = indentLength + colonIndex + 1;
        if (valueStart < indentLength + content.length) {
            this.tokens.push({
                line: lineIndex,
                startChar: valueStart,
                length: indentLength + content.length - valueStart,
                type: 'string'
            });
        }
    }
    onCreate(node, line) {
        const lineIndex = node.getLine() - 1;
        // Guardar nodo en el mapa
        this.nodeByLine.set(lineIndex, node);
        // Generar tokens para este nodo
        this.generateTokensForNode(node, lineIndex, line);
    }
    onFinish(node) {
        // No necesitamos hacer nada aquí por ahora
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