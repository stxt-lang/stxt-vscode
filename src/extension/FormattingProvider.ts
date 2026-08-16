import { getAnalysis } from './AnalysisDoc';
import { AnalysisResult } from './AnalysisResult';
import { InlineNode, StringUtils, type Node } from '@stxt-lang/core';
import { DocumentFormattingEditProvider, Range, TextDocument, TextEdit } from 'vscode';

export class StxtFormattingProvider implements DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        const analysis = getAnalysis(document);
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
 * Last line of the document, with no content other than its indentation and belonging
 * to a text block. It is an empty line of the block content, and STXT-SPEC §10.3
 * requires preserving it: trimming it would leave "", which at the end of the file is
 * indistinguishable from the trailing newline, and the block would lose that line.
 */
function isFinalBlockBlank(line: string, index: number, lineCount: number, analysis: AnalysisResult | undefined): boolean {
    return index === lineCount - 1
        && line.trim() === ''
        && line.length > 0
        && (analysis?.textLineByLineNumber.has(index) ?? false);
}

// Placeholder so that it compiles:
function createLine(line: string, node: Node | undefined): string {
    if (!node) {
        return StringUtils.rightTrim(line);
    }

    let result = "\t".repeat(node.getLevel());

    if (!(node instanceof InlineNode)) {
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

        // Without a value the space after the colon is not written: container nodes
        // would end up with a stray trailing space.
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
