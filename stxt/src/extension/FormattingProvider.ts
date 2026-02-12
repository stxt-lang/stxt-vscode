import * as vscode from 'vscode';
import { getLastAnalysis } from './AnalysisDoc';
import type { Node } from '../core/Node';
import { rightTrim } from '../core/StringUtils';

export class StxtFormattingProvider implements vscode.DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
        const analysis = getLastAnalysis(document);
        const edits: vscode.TextEdit[] = [];

        const lines = document.getText().split(/\r?\n/);

        lines.forEach((line, index) => {
            const node = analysis?.nodeByLine.get(index);
            const newLine = createLine(line, node);
            if (newLine !== line) {
                edits.push(vscode.TextEdit.replace(new vscode.Range(index, 0, index, line.length), newLine));
            }
        });

        return edits;
    }
}

// Placeholder para que compile:
function createLine(line: string, node: Node | undefined): string {
    if (!node) {
        return rightTrim(line);
    }

    let result = "\t".repeat(node.getLevel());
    const indexNs = line.indexOf("(");

    if (node.isTextNode()) {
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + ") >>";
        }
        else {
            result += node.getName() + " >>";
        }
    } else {
        if (indexNs !== -1) {
            result += node.getName() + " (" + node.getNamespace() + "): ";
        }
        else {
            result += node.getName() + ": ";
        }
    }


    return result;
}
