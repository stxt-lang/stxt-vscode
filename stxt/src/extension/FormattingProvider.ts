import { getLastAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { StringUtils, type Node } from '@stxt-lang/core';
import { DocumentFormattingEditProvider, Range, TextDocument, TextEdit } from 'vscode';

export class StxtFormattingProvider implements DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const analysis = getLastAnalysis(document);
        const edits: TextEdit[] = [];

        const lines = document.getText().split(/\r?\n/);

        lines.forEach((line, index) => {
            const node = analysis?.nodeByLine.get(index);
            const newLine = isFinalBlockBlank(line, index, lines.length, analysis) ? line : createLine(line, node);
            if (newLine !== line) {
                edits.push(TextEdit.replace(new Range(index, 0, index, line.length), newLine));
            }
        });

        return edits;
    }
}

/**
 * Última línea del documento, sin más contenido que su indentación y perteneciente a
 * un bloque de texto. Es una línea vacía del contenido del bloque, y STXT-SPEC §10.3
 * obliga a preservarla: recortarla la dejaría en «», que al final del fichero es
 * indistinguible del salto de línea final, y el bloque perdería esa línea.
 */
function isFinalBlockBlank(line: string, index: number, lineCount: number, analysis: AnalysisResult | undefined): boolean {
    return index === lineCount - 1
        && line.trim() === ''
        && line.length > 0
        && (analysis?.textLineByLineNumber.has(index) ?? false);
}

// Placeholder para que compile:
function createLine(line: string, node: Node | undefined): string {
    if (!node) {
        return StringUtils.rightTrim(line);
    }

    let result = "\t".repeat(node.getLevel());

    if (node.isTextNode()) {
        const namespaceIndex = line.indexOf("(");
        if (namespaceIndex !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    } else {
        const colonIndex = line.indexOf(":");
        const lineKey = line.substring(0, colonIndex);
        const namespaceIndex = lineKey.indexOf("(");

        // Sin valor no se escribe el espacio de después de los dos puntos: los nodos
        // contenedores acabarían con un espacio suelto al final de la línea.
        const value = node.getValue();
        const separator = value.length > 0 ? ": " + value : ":";

        if (namespaceIndex !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ")" + separator;
        }
        else {
            result += node.getName() + separator;
        }
    }

    return result;
}
