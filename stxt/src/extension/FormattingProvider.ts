import { getLastAnalysis } from './AnalysisDoc';
import type { Node } from '../core/Node';
import { StringUtils } from '../core/StringUtils';
import { DocumentFormattingEditProvider, Range, TextDocument, TextEdit } from 'vscode';

export class StxtFormattingProvider implements DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const analysis = getLastAnalysis(document);
        const edits: TextEdit[] = [];

        const lines = document.getText().split(/\r?\n/);

        lines.forEach((line, index) => {
            const node = analysis?.nodeByLine.get(index);
            const newLine = createLine(line, node);
            if (newLine !== line) {
                edits.push(TextEdit.replace(new Range(index, 0, index, line.length), newLine));
            }
        });

        return edits;
    }
}

// Placeholder para que compile:
function createLine(line: string, node: Node | undefined): string {
    if (!node) {
        return StringUtils.rightTrim(line);
    }

    let result = "\t".repeat(node.getLevel());

    if (node.isTextNode()) {
        const indexNs = line.indexOf("(");
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    } else {
        const indexPuntos = line.indexOf(":");
        const lineKey = line.substring(0, indexPuntos);
        const indexNs = lineKey.indexOf("(");

        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + "): " + node.getValue();
        }
        else {
            result += node.getName() + ": " + node.getValue();
        }
    }

    return result;
}
