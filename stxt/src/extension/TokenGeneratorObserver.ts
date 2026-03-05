import { Observer } from '../processors/Observer';
import { Node } from '../core/Node';
import { StxtToken } from './Tokens';

export class TokenGeneratorObserver implements Observer {
    private tokens: StxtToken[] = [];
    private nodeByLine = new Map<number, Node>();

    onTextLine(node: Node, lineNumber: number, line: string): void {
        // No operation
    }

    onCreate(node: Node, line: string): void {
        const lineIndex = node.getLine() - 1;
        
        // Guardar nodo en el mapa
        this.nodeByLine.set(lineIndex, node);

        // Generar tokens para este nodo
        this.generateTokensForNode(node, lineIndex, line);
    }

    onFinish(node: Node): void {
        // No necesitamos hacer nada aquí por ahora
    }

    onComment(lineNumber: number, line: string): void {
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

    getTokens(): StxtToken[] {
        return this.tokens;
    }

    getNodeByLine(): Map<number, Node> {
        return this.nodeByLine;
    }

    private generateTokensForNode(node: Node, lineIndex: number, line: string): void {
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
            } else {
                this.tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: 'macro' });
                this.tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: 'macro' });
            }
        } else {
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
            } else {
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
